"""Flask streaming server for video feed"""
import time
import threading
from flask import Flask, Response
from flask_cors import CORS

from .config import EDGE_STREAM_PORT

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
        
        import cv2
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
    from .config import EDGE_STREAM_URL
    return {'status': 'ok', 'camera': EDGE_STREAM_URL}


def start_flask_server():
    """Start Flask server in background thread"""
    print(f"[stream] Starting Flask server on port {EDGE_STREAM_PORT}")
    flask_app.run(host='0.0.0.0', port=EDGE_STREAM_PORT, threaded=True, debug=False)


def update_latest_frame(frame):
    """Update the global latest frame (thread-safe)"""
    global latest_frame
    with frame_lock:
        latest_frame = frame.copy()
