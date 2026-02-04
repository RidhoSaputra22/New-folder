# Visitor Monitoring System MVP

Sistem monitoring jumlah pengunjung perpustakaan berbasis CCTV dengan YOLOv5 + tracking.

## Fitur Utama

- ✅ Deteksi manusia menggunakan **YOLOv5**
- ✅ **Tracking** agar tidak menghitung orang yang sama berkali-kali
- ✅ **Pengunjung Unik Harian** (masuk 2-3 kali dalam sehari tetap dihitung 1 kali)
- ✅ **Dashboard** dengan statistik real-time
- ✅ Filter per tanggal/periode
- ✅ Export laporan CSV

## Teknologi

- **Backend**: FastAPI + SQLite
- **Edge/AI**: YOLOv5 + OpenCV + Centroid Tracker
- **Frontend**: Next.js

## Struktur Folder

```
visitor-monitoring-mvp-yolov5/
├── backend/           # FastAPI backend
│   ├── app/
│   │   ├── main.py    # API endpoints
│   │   ├── models.py  # Database models
│   │   ├── db.py      # Database connection
│   │   ├── auth.py    # Authentication
│   │   └── settings.py
│   └── requirements.txt
├── edge/              # Edge worker (YOLO detection)
│   ├── worker.py      # Main detection & tracking
│   └── requirements.txt
├── frontend/          # Next.js dashboard
│   ├── app/
│   │   ├── page.js
│   │   ├── login/
│   │   ├── dashboard/
│   │   └── camera/
│   └── package.json
└── .env               # Configuration
```

## Cara Menjalankan (Manual, tanpa Docker)

### 1. Setup Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Run backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend akan berjalan di: http://localhost:8000

### 2. Setup Edge Worker

```bash
cd edge

# Create virtual environment (bisa pakai venv yang sama atau beda)
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run edge worker
python worker.py
```

Edge worker akan:
- Streaming video di: http://localhost:5000/video_feed
- Mengirim event ke backend secara otomatis

### 3. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Frontend akan berjalan di: http://localhost:3000

## Konfigurasi (.env)

```env
# Backend
APP_ENV=dev
JWT_SECRET=your-secret-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
DATABASE_URL=sqlite:///./visitors.db

# Edge
EDGE_MODE=fake           # fake (random data) | real (YOLO detection)
EDGE_CAMERA_ID=1
EDGE_STREAM_URL=0        # 0 = webcam, atau URL stream
BACKEND_URL=http://localhost:8000

# Frontend
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

## Mode Edge Worker

### Mode FAKE (Testing)
```env
EDGE_MODE=fake
```
Generate data random untuk testing tanpa kamera.

### Mode REAL (Production)
```env
EDGE_MODE=real
EDGE_STREAM_URL=0                    # Webcam
# atau
EDGE_STREAM_URL=rtsp://ip:port/stream  # IP Camera
```

## Database Schema

Sesuai dengan konsep proyek:

1. **roles** - Role pengguna (ADMIN, OPERATOR)
2. **users** - Data pengguna
3. **cameras** - Konfigurasi kamera
4. **counting_areas** - Area ROI per kamera
5. **visitor_daily** - Pengunjung unik harian
6. **visit_events** - Log event kunjungan
7. **daily_stats** - Statistik harian (cache)

## Logika Pengunjung Unik Harian

```
visitor_key = hash(camera_id + track_id + tanggal)

Saat ada event:
1. Cek (visit_date, visitor_key) di visitor_daily
2. Jika BELUM ADA → insert (unik bertambah)
3. Jika SUDAH ADA → update last_seen_at (unik tidak bertambah)
```

## API Endpoints

### Auth
- `POST /api/auth/login` - Login
- `GET /api/me` - Get current user

### Cameras
- `GET /api/cameras` - List cameras
- `GET /api/cameras/{id}` - Get camera
- `PUT /api/cameras/{id}` - Update camera
- `GET /api/cameras/{id}/areas` - Get counting areas

### Statistics
- `GET /api/stats/daily` - Daily stats
- `GET /api/stats/summary` - Dashboard summary

### Reports
- `GET /api/reports/csv` - Export CSV

### Edge Integration
- `POST /api/events/ingest` - Receive events from edge

## Default Login

- Username: `admin`
- Password: `admin123`

## Screenshots

Dashboard menampilkan:
- Total event kunjungan
- **Pengunjung unik harian** (highlight)
- Total masuk/keluar
- Live camera preview
- Tabel statistik per kamera

## License

MIT
