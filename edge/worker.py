"""
Edge Worker untuk Visitor Monitoring
- Deteksi manusia menggunakan YOLOv5
- Tracking dengan CentroidTracker
- Menghitung pengunjung unik harian (visitor_key)
- Mengirim event ke backend API

Refactored version with modular structure
"""
import threading
import time

from core.config import MODE
from core.streaming import start_flask_server
from core.loops import real_loop


def main():
    """Main entry point"""
    # Start Flask server in background thread
    flask_thread = threading.Thread(target=start_flask_server, daemon=True)
    flask_thread.start()
    print("[main] Flask streaming server started in background")
    
    # Wait a bit for Flask to start
    time.sleep(2)
    
    # Run appropriate loop based on mode
    real_loop()
   

if __name__ == "__main__":
    main()
