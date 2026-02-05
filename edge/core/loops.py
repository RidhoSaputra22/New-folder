"""Main processing loops for different modes"""
import time
import random
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple
import cv2
import numpy as np

from .config import (
    CAMERA_ID, POST_INTERVAL, CONFIG_REFRESH, 
    EDGE_STREAM_URL, IMG_SIZE, TRACK_MAX_DISAPPEARED, TRACK_MAX_DISTANCE
)
from .api_client import (
    login_token, get_camera_config, get_counting_areas,
    generate_visitor_key, generate_visitor_key_from_embedding, send_visitor_event
)
from .streaming import update_latest_frame
from .tracker import DeepSORTTracker, CentroidTracker, DEEPSORT_AVAILABLE
from .detection import load_yolov5_model, parse_roi, point_in_roi
from .visualization import draw_roi_polygon, draw_bounding_boxes, draw_info_overlay
from .reid import update_track_embedding, get_visitor_key_for_track, cleanup_old_tracks, reset_daily_cache


def real_loop():
    """Mode REAL: YOLOv5 detection + DeepSORT tracking + ReID visitor counting"""
    tracker_mode = "DeepSORT+ReID" if DEEPSORT_AVAILABLE else "CentroidTracker"
    print(f"[edge] running in REAL mode (YOLOv5 + {tracker_mode} + ROI counting)")
    token = login_token()

    model = load_yolov5_model()
    
    # Use DeepSORT if available, fallback to CentroidTracker
    if DEEPSORT_AVAILABLE:
        tracker = DeepSORTTracker(
            max_age=TRACK_MAX_DISAPPEARED,
            n_init=3,
            max_cosine_distance=0.3
        )
    else:
        tracker = CentroidTracker(max_disappeared=TRACK_MAX_DISAPPEARED, max_distance=TRACK_MAX_DISTANCE)

    last_cfg_fetch = 0.0
    roi = None
    stream_url = EDGE_STREAM_URL or ""
    area_id = None
    
    # Track visitor states untuk display (track_id -> {is_new, direction})
    visitor_states: Dict[int, Dict[str, Any]] = {}
    current_date = ""

    cap = None

    def open_capture(url: str):
        """Open video capture"""
        if url.isdigit():
            c = cv2.VideoCapture(int(url))
        else:
            c = cv2.VideoCapture(url)
        c.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        return c

    while True:
        now = time.time()
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Reset visitor states if date changed
        if today != current_date:
            visitor_states = {}
            current_date = today
            reset_daily_cache(today)  # Reset ReID embedding cache
            print(f"[edge] New day: {today}, reset visitor tracking")

        # Refresh config from backend
        if now - last_cfg_fetch > CONFIG_REFRESH or last_cfg_fetch == 0:
            cfg = get_camera_config(token)
            if cfg:
                if not EDGE_STREAM_URL:
                    stream_url = (cfg.get("stream_url") or "").strip() or stream_url
            
            # Get counting areas
            areas = get_counting_areas(token)
            if areas:
                active_area = next((a for a in areas if a.get("is_active")), None)
                if active_area:
                    roi_raw = active_area.get("roi_polygon")
                    roi = parse_roi(roi_raw)
                    area_id = active_area.get("area_id")
            
            # Default ROI if not set
            if not roi:
                roi = [[50, 50], [1230, 50], [1230, 670], [50, 670]]
                
            last_cfg_fetch = now
            if roi:
                print(f"[edge] ROI loaded: {roi}")
            if stream_url:
                print(f"[edge] Stream URL: {stream_url}")

        if not stream_url:
            print("[edge] Stream URL not set. Configure via UI or env EDGE_STREAM_URL")
            time.sleep(5)
            continue

        if cap is None or not cap.isOpened():
            cap = open_capture(stream_url)
            if not cap.isOpened():
                print("[edge] Failed to open stream. Retrying...")
                try:
                    cap.release()
                except Exception:
                    pass
                cap = None
                time.sleep(3)
                continue

        ok, frame = cap.read()
        if not ok or frame is None:
            print("[edge] Frame read failed. Reconnecting...")
            try:
                cap.release()
            except Exception:
                pass
            cap = None
            time.sleep(1)
            continue

        # Buat copy untuk drawing
        display_frame = frame.copy()

        # YOLO inference
        results = model(frame, size=IMG_SIZE)
        det = results.xyxy[0].detach().cpu().numpy() if hasattr(results, "xyxy") else np.zeros((0, 6), dtype=np.float32)

        # Prepare detections for tracker: (x1, y1, x2, y2, confidence)
        detections: List[Tuple[float, float, float, float, float]] = []
        
        for x1, y1, x2, y2, conf, cls in det:
            cx = (x1 + x2) / 2.0
            cy = (y1 + y2) / 2.0
            # Check if detection is in ROI
            if point_in_roi(roi, cx, cy):
                detections.append((float(x1), float(y1), float(x2), float(y2), float(conf)))

        # Update tracker (DeepSORT needs frame for ReID feature extraction)
        if DEEPSORT_AVAILABLE:
            tracks = tracker.update(frame, detections)
        else:
            # Fallback: extract bboxes only for CentroidTracker
            bboxes = [(d[0], d[1], d[2], d[3]) for d in detections]
            tracks = tracker.update(bboxes)
        
        # Cleanup old tracks from ReID cache
        cleanup_old_tracks(list(tracks.keys()))

        # Process tracks and send events
        now_time = datetime.now(timezone.utc)
        
        for tid, tr in tracks.items():
            in_roi_now = point_in_roi(roi, tr.centroid[0], tr.centroid[1])
            
            # Get or create visitor_key using ReID embedding (more stable)
            embedding = tr.embedding if hasattr(tr, 'embedding') else None
            visitor_key = update_track_embedding(tid, embedding, CAMERA_ID, today)
            
            # Initialize visitor state if not exists
            if tid not in visitor_states:
                visitor_states[tid] = {'is_new': True, 'direction': 'IN_ROI', 'visitor_key': visitor_key}
            
            # Calculate average confidence from detections
            avg_confidence = np.mean([d[4] for d in detections]) if detections else 0.0
            
            # Detect ROI entry (visitor masuk)
            if (not tr.in_roi) and in_roi_now:
                # Send event to backend
                payload = {
                    "camera_id": CAMERA_ID,
                    "area_id": area_id,
                    "event_time": now_time.isoformat(),
                    "track_id": f"t{tid}",
                    "visitor_key": visitor_key,
                    "direction": "IN",
                    "confidence_avg": round(avg_confidence, 4)
                }
                
                result = send_visitor_event(payload, token)
                if result["success"]:
                    is_new = result["data"].get("is_new_unique", False)
                    status = "NEW" if is_new else "EXISTING"
                    visitor_states[tid] = {'is_new': is_new, 'direction': 'IN', 'visitor_key': visitor_key}
                    print(f"[edge] Visitor IN: {visitor_key[:8]}... [{status}] -> {result['status_code']}")
                else:
                    print(f"[edge] Failed to send: {result.get('error', 'Unknown')}")
            
            # Detect ROI exit (visitor keluar)
            elif tr.in_roi and (not in_roi_now):
                payload = {
                    "camera_id": CAMERA_ID,
                    "area_id": area_id,
                    "event_time": now_time.isoformat(),
                    "track_id": f"t{tid}",
                    "visitor_key": visitor_key,
                    "direction": "OUT",
                    "confidence_avg": round(avg_confidence, 4)
                }
                
                result = send_visitor_event(payload, token)
                if result["success"]:
                    visitor_states[tid]['direction'] = 'OUT'
                    print(f"[edge] Visitor OUT: {visitor_key[:8]}... -> {result['status_code']}")
                else:
                    print(f"[edge] Failed to send: {result.get('error', 'Unknown')}")
            
            # Update state untuk visitor di dalam ROI
            elif in_roi_now:
                if visitor_states[tid]['direction'] not in ['IN', 'OUT']:
                    visitor_states[tid]['direction'] = 'IN_ROI'
            
            tr.in_roi = in_roi_now
        
        # Draw ROI polygon
        draw_roi_polygon(display_frame, roi)
        
        # Draw bounding boxes dengan status
        draw_bounding_boxes(display_frame, tracks, visitor_states)
        
        # Draw info text
        info_lines = [f"Tracks: {len(tracks)} | {tracker_mode}"]
        draw_info_overlay(display_frame, info_lines)
        
        # Update global frame for stream server
        update_latest_frame(display_frame)

        # Small delay to prevent CPU overload
        time.sleep(0.03)
