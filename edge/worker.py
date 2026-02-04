"""
Edge Worker untuk Visitor Monitoring
- Deteksi manusia menggunakan YOLOv5
- Tracking dengan CentroidTracker
- Menghitung pengunjung unik harian (visitor_key)
- Mengirim event ke backend API
"""
import os
import time
import random
import hashlib
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
import threading
from pathlib import Path

from dotenv import load_dotenv
import requests
import numpy as np
import cv2

# Load .env file from parent directory
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# Import torch only if needed (for REAL mode)
torch = None
import torch

from flask import Flask, Response
from flask_cors import CORS

# Global variable for sharing latest frame with stream server
latest_frame = None
frame_lock = threading.Lock()

# Flask app for streaming
flask_app = Flask(__name__)
CORS(flask_app)

def gen_frames():
    """Generate MJPEG stream frames from shared worker frame"""
    print("[stream] Client connected to video feed")
    while True:
        with frame_lock:
            if latest_frame is not None:
                frame = latest_frame.copy()
            else:
                frame = None
        
        if frame is None:
            time.sleep(0.1)
            continue
        
        ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        if not ret:
            continue
            
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@flask_app.route('/video_feed')
def video_feed():
    return Response(gen_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@flask_app.route('/health')
def health():
    return {'status': 'ok', 'camera': env("EDGE_STREAM_URL", "")}

def start_flask_server():
    """Start Flask server in background thread"""
    port = int(env("EDGE_STREAM_PORT", "5000"))
    print(f"[stream] Starting Flask server on port {port}")
    flask_app.run(host='0.0.0.0', port=port, threaded=True, debug=False)


def env(name: str, default: str = "") -> str:
    return os.getenv(name, default)


MODE = env("EDGE_MODE", "fake").lower()
CAMERA_ID = int(env("EDGE_CAMERA_ID", "1"))

POST_INTERVAL = int(env("EDGE_POST_INTERVAL_SECONDS", "3"))
CONFIG_REFRESH = int(env("EDGE_CONFIG_REFRESH_SECONDS", "30"))

EDGE_STREAM_URL = env("EDGE_STREAM_URL", "").strip()

CONF_TH = float(env("YOLOV5_CONF", "0.35"))
IOU_TH = float(env("YOLOV5_IOU", "0.45"))
IMG_SIZE = int(env("YOLOV5_IMG_SIZE", "640"))
DEVICE = env("YOLOV5_DEVICE", "cpu")
WEIGHTS = env("YOLOV5_WEIGHTS", "").strip()
REPO = env("YOLOV5_REPO", "").strip()

TRACK_MAX_DISAPPEARED = int(env("TRACK_MAX_DISAPPEARED", "20"))
TRACK_MAX_DISTANCE = float(env("TRACK_MAX_DISTANCE", "80"))

# Backend API configuration (no Docker)
BACKEND_URL = env("BACKEND_URL", "http://localhost:8000")
INGEST_URL = f"{BACKEND_URL}/api/events/ingest"
AUTH_USER = env("EDGE_AUTH_USERNAME", "admin")
AUTH_PASS = env("EDGE_AUTH_PASSWORD", "admin123")


def generate_visitor_key(camera_id: int, track_id: int, date_str: str) -> str:
    """
    Generate visitor_key untuk identifikasi pengunjung unik.
    Format: hash dari camera_id + track_id + date
    Ini adalah pendekatan MVP. Untuk lebih akurat, gunakan ReID embedding.
    """
    raw = f"{camera_id}_{track_id}_{date_str}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def login_token() -> Optional[str]:
    """Login ke backend dan dapatkan JWT token"""
    try:
        r = requests.post(
            f"{BACKEND_URL}/api/auth/login",
            json={"username": AUTH_USER, "password": AUTH_PASS},
            timeout=10,
        )
        if r.status_code == 200:
            return r.json()["access_token"]
    except Exception as e:
        print(f"[edge] Login failed: {e}")
    return None


def get_camera_config(token: Optional[str]) -> Dict[str, Any]:
    """Get camera configuration from backend"""
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    try:
        r = requests.get(f"{BACKEND_URL}/api/cameras/{CAMERA_ID}", headers=headers, timeout=10)
        if r.status_code == 200:
            return r.json()
    except Exception as e:
        print(f"[edge] Failed to get camera config: {e}")
    return {}


def get_counting_areas(token: Optional[str]) -> List[Dict[str, Any]]:
    """Get counting areas for camera from backend"""
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    try:
        r = requests.get(f"{BACKEND_URL}/api/cameras/{CAMERA_ID}/areas", headers=headers, timeout=10)
        if r.status_code == 200:
            return r.json()
    except Exception as e:
        print(f"[edge] Failed to get counting areas: {e}")
    return []


def load_yolov5_model():
    """Load YOLOv5 via torch.hub.

    Strategy:
    - If YOLOV5_REPO + YOLOV5_WEIGHTS set: load local repo (offline-friendly)
    - Else: load from ultralytics/yolov5 (needs internet first time)
    """
    if torch is None:
        raise RuntimeError("PyTorch not installed. Install with: pip install torch torchvision")
    
    if REPO and WEIGHTS:
        model = torch.hub.load(REPO, "custom", path=WEIGHTS, source="local")
    elif WEIGHTS and not REPO:
        model = torch.hub.load("ultralytics/yolov5", "custom", path=WEIGHTS)
    else:
        model = torch.hub.load("ultralytics/yolov5", "yolov5s", pretrained=True)

    model.conf = CONF_TH
    model.iou = IOU_TH
    model.classes = [0]  # person only
    model.to(DEVICE)
    return model


def point_in_roi(roi: Optional[List[List[float]]], x: float, y: float) -> bool:
    if not roi or len(roi) < 3:
        return True  # ROI not set => whole frame
    poly = np.array(roi, dtype=np.int32)
    return cv2.pointPolygonTest(poly, (float(x), float(y)), False) >= 0


@dataclass
class Track:
    tid: int
    centroid: Tuple[float, float]
    bbox: Tuple[float, float, float, float]  # x1,y1,x2,y2
    disappeared: int = 0
    in_roi: bool = False


class CentroidTracker:
    def __init__(self, max_disappeared: int = 20, max_distance: float = 80.0):
        self.max_disappeared = max_disappeared
        self.max_distance = max_distance
        self.next_id = 1
        self.tracks: Dict[int, Track] = {}

    def update(self, detections: List[Tuple[float, float, float, float]]) -> Dict[int, Track]:
        # no detections: age tracks
        if len(detections) == 0:
            to_del = []
            for tid, tr in self.tracks.items():
                tr.disappeared += 1
                if tr.disappeared > self.max_disappeared:
                    to_del.append(tid)
            for tid in to_del:
                del self.tracks[tid]
            return self.tracks

        det_centroids = []
        for (x1, y1, x2, y2) in detections:
            det_centroids.append(((x1 + x2) / 2.0, (y1 + y2) / 2.0))
        det_centroids = np.array(det_centroids, dtype=np.float32)

        # initialize
        if len(self.tracks) == 0:
            for i, bbox in enumerate(detections):
                c = tuple(det_centroids[i])
                tid = self.next_id
                self.next_id += 1
                self.tracks[tid] = Track(tid=tid, centroid=c, bbox=bbox)
            return self.tracks

        track_ids = list(self.tracks.keys())
        track_centroids = np.array([self.tracks[tid].centroid for tid in track_ids], dtype=np.float32)

        # distance matrix
        dists = np.linalg.norm(track_centroids[:, None, :] - det_centroids[None, :, :], axis=2)

        used_tracks = set()
        used_dets = set()

        # greedy assign smallest distances first
        for _ in range(min(dists.shape[0], dists.shape[1])):
            t_idx, d_idx = np.unravel_index(np.argmin(dists), dists.shape)
            min_dist = dists[t_idx, d_idx]
            if min_dist > self.max_distance:
                break

            tid = track_ids[t_idx]
            if tid in used_tracks or d_idx in used_dets:
                dists[t_idx, d_idx] = np.inf
                continue

            self.tracks[tid].centroid = tuple(det_centroids[d_idx])
            self.tracks[tid].bbox = detections[d_idx]
            self.tracks[tid].disappeared = 0

            used_tracks.add(tid)
            used_dets.add(d_idx)

            dists[t_idx, :] = np.inf
            dists[:, d_idx] = np.inf

        # age unmatched tracks
        to_del = []
        for tid in track_ids:
            if tid not in used_tracks:
                self.tracks[tid].disappeared += 1
                if self.tracks[tid].disappeared > self.max_disappeared:
                    to_del.append(tid)
        for tid in to_del:
            del self.tracks[tid]

        # create new tracks for unmatched detections
        for i, bbox in enumerate(detections):
            if i in used_dets:
                continue
            c = tuple(det_centroids[i])
            tid = self.next_id
            self.next_id += 1
            self.tracks[tid] = Track(tid=tid, centroid=c, bbox=bbox)

        return self.tracks


def fake_loop():
    """Mode FAKE: generate random visitor data untuk testing"""
    print("[edge] running in FAKE mode - generating random data")
    token = login_token()
    headers = {"Authorization": f"Bearer {token}"} if token else {}

    visitor_counter = 0
    while True:
        # Generate random visitors
        num_visitors = random.randint(0, 3)
        now = datetime.now(timezone.utc)
        date_str = now.strftime("%Y-%m-%d")
        
        for _ in range(num_visitors):
            visitor_counter += 1
            track_id = f"fake_{visitor_counter}"
            visitor_key = generate_visitor_key(CAMERA_ID, visitor_counter % 50, date_str)
            direction = random.choice(["IN", "OUT", None])
            
            payload = {
                "camera_id": CAMERA_ID,
                "event_time": now.isoformat(),
                "track_id": track_id,
                "visitor_key": visitor_key,
                "direction": direction,
                "confidence_avg": round(random.uniform(0.7, 0.95), 2)
            }
            
            try:
                r = requests.post(INGEST_URL, json=payload, headers=headers, timeout=10)
                if r.status_code == 200:
                    is_new = r.json().get("is_new_unique", False)
                    status = "NEW" if is_new else "EXISTING"
                    print(f"[edge] sent visitor {visitor_key[:8]}... dir={direction} [{status}] -> {r.status_code}")
                else:
                    print(f"[edge] ERROR {r.status_code}: {r.text}")
            except Exception as e:
                print(f"[edge] failed to send: {e}")
        
        time.sleep(POST_INTERVAL)


def real_loop():
    """Mode REAL: YOLOv5 detection + tracking + visitor counting"""
    print("[edge] running in REAL mode (YOLOv5 + tracking + ROI counting)")
    token = login_token()
    headers = {"Authorization": f"Bearer {token}"} if token else {}

    model = load_yolov5_model()
    tracker = CentroidTracker(max_disappeared=TRACK_MAX_DISAPPEARED, max_distance=TRACK_MAX_DISTANCE)

    last_cfg_fetch = 0.0
    roi = None
    stream_url = EDGE_STREAM_URL or ""
    area_id = None
    
    # Track visitors yang sudah dikirim hari ini
    sent_visitors_today: Dict[str, bool] = {}
    current_date = ""

    last_post = time.time()
    cap = None

    def open_capture(url: str):
        """Open video capture"""
        # Support for webcam index (0, 1, etc.) or URL
        if url.isdigit():
            c = cv2.VideoCapture(int(url))
        else:
            c = cv2.VideoCapture(url)
        c.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        return c

    while True:
        now = time.time()
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Reset sent visitors if date changed
        if today != current_date:
            sent_visitors_today = {}
            current_date = today
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
                    roi = active_area.get("roi_polygon")
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

        # Update global frame for stream server
        with frame_lock:
            global latest_frame
            latest_frame = frame.copy()

        # YOLO inference
        results = model(frame, size=IMG_SIZE)
        det = results.xyxy[0].detach().cpu().numpy() if hasattr(results, "xyxy") else np.zeros((0, 6), dtype=np.float32)

        bboxes: List[Tuple[float, float, float, float]] = []
        confidences: List[float] = []
        
        for x1, y1, x2, y2, conf, cls in det:
            cx = (x1 + x2) / 2.0
            cy = (y1 + y2) / 2.0
            # Check if detection is in ROI
            if point_in_roi(roi, cx, cy):
                bboxes.append((float(x1), float(y1), float(x2), float(y2)))
                confidences.append(float(conf))

        # Update tracker
        tracks = tracker.update(bboxes)

        # Process tracks and send events
        now_time = datetime.now(timezone.utc)
        
        for tid, tr in tracks.items():
            in_roi_now = point_in_roi(roi, tr.centroid[0], tr.centroid[1])
            
            # Detect ROI entry (visitor masuk)
            if (not tr.in_roi) and in_roi_now:
                visitor_key = generate_visitor_key(CAMERA_ID, tid, today)
                
                # Send event to backend
                payload = {
                    "camera_id": CAMERA_ID,
                    "area_id": area_id,
                    "event_time": now_time.isoformat(),
                    "track_id": f"t{tid}",
                    "visitor_key": visitor_key,
                    "direction": "IN",
                    "confidence_avg": round(np.mean(confidences) if confidences else 0.0, 4)
                }
                
                try:
                    r = requests.post(INGEST_URL, json=payload, headers=headers, timeout=10)
                    is_new = r.json().get("is_new_unique", False) if r.status_code == 200 else False
                    status = "NEW" if is_new else "EXISTING"
                    print(f"[edge] Visitor IN: {visitor_key[:8]}... [{status}] -> {r.status_code}")
                except Exception as e:
                    print(f"[edge] Failed to send: {e}")
            
            # Detect ROI exit (visitor keluar)
            elif tr.in_roi and (not in_roi_now):
                visitor_key = generate_visitor_key(CAMERA_ID, tid, today)
                
                payload = {
                    "camera_id": CAMERA_ID,
                    "area_id": area_id,
                    "event_time": now_time.isoformat(),
                    "track_id": f"t{tid}",
                    "visitor_key": visitor_key,
                    "direction": "OUT",
                    "confidence_avg": round(np.mean(confidences) if confidences else 0.0, 4)
                }
                
                try:
                    r = requests.post(INGEST_URL, json=payload, headers=headers, timeout=10)
                    print(f"[edge] Visitor OUT: {visitor_key[:8]}... -> {r.status_code}")
                except Exception as e:
                    print(f"[edge] Failed to send: {e}")
            
            tr.in_roi = in_roi_now

        # Small delay to prevent CPU overload
        time.sleep(0.03)


def webcam_simple_loop():
    """
    Mode WEBCAM SIMPLE: Stream dari webcam tanpa YOLO detection
    Generate visitor events secara periodik untuk testing dengan webcam nyata
    """
    print("[edge] running in WEBCAM SIMPLE mode (no YOLO, stream from webcam)")
    print("[edge] This will generate periodic visitor events while showing live feed")
    
    # Wait for Flask to start
    time.sleep(1)
    
    token = login_token()
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    
    if not token:
        print("[edge] Warning: Could not get auth token, continuing without authentication")

    last_cfg_fetch = 0.0
    stream_url = EDGE_STREAM_URL or ""
    area_id = 2  # Default area ID (from our setup)

    visitor_counter = 0
    last_visitor_time = time.time()
    VISITOR_INTERVAL = 5  # Generate visitor every 5 seconds
    
    cap = None

    def open_capture(url: str):
        """Open video capture"""
        if url.isdigit():
            c = cv2.VideoCapture(int(url))
        else:
            c = cv2.VideoCapture(url)
        c.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        return c

    # Try to get config on startup
    try:
        cfg = get_camera_config(token)
        if cfg:
            if not EDGE_STREAM_URL:
                stream_url = (cfg.get("stream_url") or "").strip() or stream_url
        
        # Get counting areas
        areas = get_counting_areas(token)
        if areas:
            active_area = next((a for a in areas if a.get("is_active")), None)
            if active_area:
                area_id = active_area.get("area_id")
        
        last_cfg_fetch = time.time()
        if stream_url:
            print(f"[edge] Stream URL: {stream_url}")
        if area_id:
            print(f"[edge] Area ID: {area_id}")
    except Exception as e:
        print(f"[edge] Warning: Failed to get config from backend: {e}")
        print(f"[edge] Using EDGE_STREAM_URL from .env: {stream_url}")
        print(f"[edge] Using default area_id: {area_id}")

    while True:
        now = time.time()
        today = datetime.now().strftime("%Y-%m-%d")

        # Refresh config from backend periodically
        if now - last_cfg_fetch > CONFIG_REFRESH:
            try:
                cfg = get_camera_config(token)
                if cfg:
                    if not EDGE_STREAM_URL:
                        stream_url = (cfg.get("stream_url") or "").strip() or stream_url
                
                # Get counting areas
                areas = get_counting_areas(token)
                if areas:
                    active_area = next((a for a in areas if a.get("is_active")), None)
                    if active_area:
                        area_id = active_area.get("area_id")
                    
                last_cfg_fetch = now
            except Exception as e:
                print(f"[edge] Config refresh failed: {e}")

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

        # Update global frame for stream server
        with frame_lock:
            global latest_frame
            latest_frame = frame.copy()

        # Generate visitor events periodically (simulating detection)
        if now - last_visitor_time >= VISITOR_INTERVAL:
            visitor_counter += 1
            track_id = f"webcam_{visitor_counter}"
            visitor_key = generate_visitor_key(CAMERA_ID, visitor_counter % 30, today)
            direction = random.choice(["IN", "OUT"])
            now_time = datetime.now(timezone.utc)
            
            payload = {
                "camera_id": CAMERA_ID,
                "area_id": area_id,
                "event_time": now_time.isoformat(),
                "track_id": track_id,
                "visitor_key": visitor_key,
                "direction": direction,
                "confidence_avg": 0.95
            }
            
            try:
                r = requests.post(INGEST_URL, json=payload, headers=headers, timeout=10)
                if r.status_code == 200:
                    is_new = r.json().get("is_new_unique", False)
                    status = "NEW" if is_new else "EXISTING"
                    print(f"[edge] Visitor {direction}: {visitor_key[:8]}... [{status}] -> {r.status_code}")
                else:
                    print(f"[edge] ERROR {r.status_code}: {r.text}")
            except Exception as e:
                print(f"[edge] Failed to send: {e}")
            
            last_visitor_time = now

        # Small delay
        time.sleep(0.1)


def main():
    # Start Flask server in background thread
    flask_thread = threading.Thread(target=start_flask_server, daemon=True)
    flask_thread.start()
    print("[main] Flask streaming server started in background")
    
    # Wait a bit for Flask to start
    time.sleep(2)
    
    if MODE == "fake":
        fake_loop()
    else:
        # Use simple webcam mode (no YOLO) for MVP
        print("[main] Running in WEBCAM SIMPLE mode (no YOLO detection)")
        print("[main] This shows live camera feed and generates periodic visitor events")
        webcam_simple_loop()


if __name__ == "__main__":
    main()
