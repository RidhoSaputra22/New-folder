"""
HTTP Webcam Stream Server
Untuk testing dengan webcam lokal.
Jalankan ini jika ingin stream webcam via HTTP.
"""
import cv2
from flask import Flask, Response

app = Flask(__name__)

# Try different camera backends for Windows
cap = None
for backend in [cv2.CAP_DSHOW, cv2.CAP_MSMF, cv2.CAP_ANY]:
    cap = cv2.VideoCapture(0, backend)
    if cap.isOpened():
        print(f"[webcam] Opened with backend: {backend}")
        break

if not cap or not cap.isOpened():
    raise RuntimeError("Webcam tidak terbuka. Cek izin kamera Windows atau ganti index (0/1).")

def gen():
    while True:
        ok, frame = cap.read()
        if not ok:
            continue
        ok, jpg = cv2.imencode(".jpg", frame)
        if not ok:
            continue
        yield (b"--frame\r\n"
               b"Content-Type: image/jpeg\r\n\r\n" + jpg.tobytes() + b"\r\n")

@app.get("/video")
def video():
    return Response(gen(), mimetype="multipart/x-mixed-replace; boundary=frame")

@app.get("/health")
def health():
    return {"status": "ok", "camera": "webcam"}

if __name__ == "__main__":
    print("[webcam] Stream akan tersedia di: http://localhost:8080/video")
    app.run(host="0.0.0.0", port=8081, threaded=True)
