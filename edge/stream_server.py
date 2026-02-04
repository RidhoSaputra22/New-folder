"""
Standalone stream server (optional)
Worker.py sudah include Flask server untuk streaming.
File ini bisa digunakan jika ingin menjalankan stream server terpisah.
"""
import os
import cv2
import time
from flask import Flask, Response
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

EDGE_STREAM_URL = os.getenv("EDGE_STREAM_URL", "0").strip()

def gen_frames():
    """Generate MJPEG stream frames from camera"""
    # Support webcam index or URL
    if EDGE_STREAM_URL.isdigit():
        cap = cv2.VideoCapture(int(EDGE_STREAM_URL))
    else:
        cap = cv2.VideoCapture(EDGE_STREAM_URL)
    
    if not cap.isOpened():
        print(f"[stream] Failed to open camera: {EDGE_STREAM_URL}")
        return
    
    print(f"[stream] Starting stream from: {EDGE_STREAM_URL}")
    
    while True:
        ok, frame = cap.read()
        if not ok:
            time.sleep(0.1)
            continue
        
        ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        if not ret:
            continue
            
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@app.route('/video_feed')
def video_feed():
    """Video streaming route"""
    return Response(gen_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/health')
def health():
    """Health check endpoint"""
    return {'status': 'ok', 'camera': EDGE_STREAM_URL}

if __name__ == '__main__':
    port = int(os.getenv("EDGE_STREAM_PORT", "5000"))
    print(f"[stream] Starting standalone stream server on port {port}")
    app.run(host='0.0.0.0', port=port, threaded=True)
