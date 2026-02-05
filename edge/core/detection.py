"""YOLOv5 detection and ROI utilities"""
import json
import warnings
from typing import Optional, List, Union
import numpy as np
import cv2

from .config import CONF_TH, IOU_TH, DEVICE, WEIGHTS, REPO


def load_yolov5_model():
    """Load YOLOv5 via torch.hub"""
    import torch
    
    # Suppress torch.cuda.amp.autocast deprecation warning
    warnings.filterwarnings("ignore", message=".*torch.cuda.amp.autocast.*", category=FutureWarning)
    
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


def parse_roi(roi_data: Optional[Union[str, List]]) -> Optional[List[List[float]]]:
    """
    Parse ROI data dari string JSON atau list
    Returns: List of points [[x1,y1], [x2,y2], ...] atau None
    """
    if not roi_data:
        return None
    
    # Jika sudah list, return langsung
    if isinstance(roi_data, list):
        return roi_data
    
    # Jika string, parse JSON
    if isinstance(roi_data, str):
        try:
            parsed = json.loads(roi_data)
            if isinstance(parsed, list):
                return parsed
        except json.JSONDecodeError as e:
            print(f"[edge] Failed to parse ROI JSON: {e}")
            return None
    
    return None


def point_in_roi(roi: Optional[List[List[float]]], x: float, y: float) -> bool:
    """Check if point is inside ROI polygon"""
    if not roi or len(roi) < 3:
        return True  # ROI not set => whole frame
    poly = np.array(roi, dtype=np.int32)
    return cv2.pointPolygonTest(poly, (float(x), float(y)), False) >= 0
