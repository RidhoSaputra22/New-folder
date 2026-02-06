"""
HTTP Webcam Stream Server (OPSIONAL)

Server ini TIDAK wajib dijalankan.
Edge worker sudah bisa membaca webcam langsung jika EDGE_STREAM_URL=0 di .env

Jalankan ini HANYA jika:
  - Ingin menjalankan kamera di PC BERBEDA dari edge worker
  - Ingin share webcam stream ke beberapa consumer
  - Webcam tidak bisa dibuka langsung oleh edge (masalah driver)

Jika webcam + edge di PC yang sama, cukup set EDGE_STREAM_URL=0 di .env
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
    print("[webcam] Stream akan tersedia di: http://localhost:8081/video")
    app.run(host="0.0.0.0", port=8081, threaded=True)
