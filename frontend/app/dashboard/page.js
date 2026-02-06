"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const STREAM_URL = process.env.NEXT_PUBLIC_STREAM_URL || "http://localhost:5000/video_feed";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function Dashboard() {
  const [me, setMe] = useState(null);
  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [err, setErr] = useState("");
  const [resetStatus, setResetStatus] = useState("");
  const day = useMemo(() => todayISO(), []);

  async function load() {
    setErr("");
    const token = localStorage.getItem("token");
    if (!token) {
      setErr("No token. Please login.");
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const meRes = await fetch(`${API_BASE}/api/me`, { headers });
      if (!meRes.ok) throw new Error("Auth failed");
      setMe(await meRes.json());

      // Get summary for today
      const summaryRes = await fetch(`${API_BASE}/api/stats/summary?day=${day}`, { headers });
      if (summaryRes.ok) {
        setSummary(await summaryRes.json());
      }

      // Get daily stats
      const dailyRes = await fetch(`${API_BASE}/api/stats/daily?day=${day}`, { headers });
      if (!dailyRes.ok) throw new Error("Failed to load stats");
      setDaily(await dailyRes.json());
    } catch (e) {
      setErr(e.message || "Error");
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [day]);

  async function handleResetDB() {
    if (!confirm("⚠️ PERINGATAN: Ini akan menghapus SEMUA data pengunjung (visitor_daily, visit_events, daily_stats). Yakin ingin melanjutkan?")) {
      return;
    }
    
    setResetStatus("loading");
    setErr("");
    
    const token = localStorage.getItem("token");
    if (!token) {
      setErr("No token. Please login.");
      setResetStatus("");
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE}/api/admin/reset-db`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ detail: "Reset failed" }));
        throw new Error(errData.detail || "Reset database gagal");
      }
      
      const result = await response.json();
      setResetStatus("success");
      
      // Reload data setelah reset
      setTimeout(() => {
        load();
        setResetStatus("");
      }, 2000);
      
    } catch (e) {
      setErr(e.message || "Error reset database");
      setResetStatus("error");
    }
  }

  const totalEvents = summary?.total_events || daily.reduce((s, r) => s + r.total_events, 0);
  const uniqueVisitors = summary?.unique_visitors || daily.reduce((s, r) => s + r.unique_visitors, 0);
  const totalIn = summary?.total_in || daily.reduce((s, r) => s + r.total_in, 0);
  const totalOut = summary?.total_out || daily.reduce((s, r) => s + r.total_out, 0);

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>Dashboard Monitoring Pengunjung</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
          <Link href="/camera">Konfigurasi Kamera</Link>
          <Link href="/login" onClick={() => localStorage.removeItem("token")}>Logout</Link>
        </div>
      </div>

      {me ? <p style={{ opacity: 0.75 }}>Logged in as: <b>{me.full_name}</b> ({me.role})</p> : null}
      {err ? <p style={{ color: "crimson" }}>{err}</p> : null}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 16 }}>
        <Card title="Tanggal (Hari ini)" value={day} />
        <Card title="Total Event" value={String(totalEvents)} subtitle="Kejadian kunjungan" />
        <Card title="Pengunjung Unik" value={String(uniqueVisitors)} subtitle="Unik per hari" highlight />
        <Card title="Masuk" value={String(totalIn)} />
        <Card title="Keluar" value={String(totalOut)} />
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Live Camera Preview</h2>
        <CameraView />
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Statistik per Kamera</h2>
        <p style={{ opacity: 0.7 }}>Data diperbarui otomatis setiap 5 detik.</p>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Tanggal</th>
              <th style={th}>Camera ID</th>
              <th style={th}>Total Event</th>
              <th style={th}>Unik</th>
              <th style={th}>Masuk</th>
              <th style={th}>Keluar</th>
            </tr>
          </thead>
          <tbody>
            {daily.map((r) => (
              <tr key={`${r.camera_id}-${r.stat_date}`}>
                <td style={td}>{r.stat_date}</td>
                <td style={td}>{r.camera_id}</td>
                <td style={td}>{r.total_events}</td>
                <td style={td}><strong>{r.unique_visitors}</strong></td>
                <td style={td}>{r.total_in}</td>
                <td style={td}>{r.total_out}</td>
              </tr>
            ))}
            {daily.length === 0 ? (
              <tr>
                <td style={td} colSpan={6}>Belum ada data. Jalankan edge worker (mode FAKE atau REAL).</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Export Laporan (CSV)</h2>
        <p style={{ opacity: 0.7 }}>Download laporan statistik pengunjung:</p>
        <code style={{ display: "block", padding: 12, background: "#f6f6f6", borderRadius: 10 }}>
          GET {API_BASE}/api/reports/csv?from_day={day}&to_day={day}
        </code>
      </section>

      {me && me.role === "ADMIN" && (
        <section style={{ marginTop: 24, padding: 20, border: "2px solid #f44336", borderRadius: 10, backgroundColor: "#fff5f5" }}>
          <h2 style={{ color: "#d32f2f", margin: "0 0 12px 0" }}>⚠️ Reset Database (Admin Only)</h2>
          <p style={{ opacity: 0.8, marginBottom: 16 }}>
            Menghapus SEMUA data pengunjung (visitor_daily, visit_events, daily_stats). 
            Data kamera dan user tidak akan terhapus.
          </p>
          
          <button
            onClick={handleResetDB}
            disabled={resetStatus === "loading"}
            style={{
              padding: "12px 24px",
              backgroundColor: resetStatus === "success" ? "#4CAF50" : "#f44336",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: resetStatus === "loading" ? "wait" : "pointer",
              fontSize: 14,
              fontWeight: 600,
              opacity: resetStatus === "loading" ? 0.6 : 1
            }}
          >
            {resetStatus === "loading" ? "⏳ Mereset..." : resetStatus === "success" ? "✅ Reset Berhasil!" : "🗑️ Reset Database"}
          </button>
          
          {resetStatus === "error" && err && (
            <p style={{ color: "#d32f2f", marginTop: 12, fontWeight: 500 }}>❌ {err}</p>
          )}
          
          {resetStatus === "success" && (
            <p style={{ color: "#2e7d32", marginTop: 12, fontWeight: 500 }}>✅ Database berhasil direset. Data sedang dimuat ulang...</p>
          )}
        </section>
      )}
    </main>
  );
}

function Card({ title, value, subtitle, highlight }) {
  return (
    <div style={{ 
      border: highlight ? "2px solid #4CAF50" : "1px solid #e5e5e5", 
      borderRadius: 14, 
      padding: 14,
      backgroundColor: highlight ? "#f8fff8" : "white"
    }}>
      <div style={{ opacity: 0.7, fontSize: 13 }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 700, marginTop: 6, color: highlight ? "#2e7d32" : "inherit" }}>{value}</div>
      {subtitle && <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>{subtitle}</div>}
    </div>
  );
}

const th = { textAlign: "left", borderBottom: "1px solid #ddd", padding: 10, opacity: 0.8 };
const td = { borderBottom: "1px solid #eee", padding: 10 };

function CameraView() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [streamUrl] = useState(STREAM_URL);
  const imgRef = useRef(null);

  // Derive health URL from stream URL (same server)
  const healthUrl = STREAM_URL.replace(/\/video_feed$/, '/health');

  useEffect(() => {
    const checkStream = async () => {
      try {
        const response = await fetch(healthUrl);
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'ok') {
            setLoading(false);
            setError("");
          } else {
            throw new Error("Edge worker belum menerima frame dari kamera.");
          }
        } else {
          throw new Error("Stream server not responding");
        }
      } catch (err) {
        setError("Camera stream not available. Pastikan edge worker sudah berjalan.");
        setLoading(false);
      }
    };

    checkStream();
    const interval = setInterval(checkStream, 10000);
    
    return () => clearInterval(interval);
  }, [healthUrl]);

  const handleImageError = () => {
    setError("Failed to load camera stream. Kamera mungkin busy atau disconnected.");
    setLoading(false);
  };

  const handleImageLoad = () => {
    setLoading(false);
    setError("");
  };

  const retryStream = () => {
    setError("");
    setLoading(true);
    if (imgRef.current) {
      imgRef.current.src = streamUrl + "?t=" + Date.now();
    }
  };

  return (
    <div style={{ border: "1px solid #e5e5e5", borderRadius: 14, padding: 14 }}>
      <h3 style={{ margin: "0 0 12px 0" }}>Live Camera Feed</h3>
      
      {loading && !error && (
        <div style={{ 
          padding: "40px", 
          textAlign: "center", 
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          margin: "12px 0"
        }}>
          <p>🔍 Loading camera stream...</p>
          <p style={{ fontSize: "12px", opacity: 0.7 }}>
            Connecting to edge server...
          </p>
        </div>
      )}
      
      {error && (
        <div style={{ 
          padding: "16px", 
          backgroundColor: "#fff3cd", 
          border: "1px solid #ffeaa7",
          borderRadius: "8px",
          margin: "12px 0"
        }}>
          <p style={{ color: "#856404", margin: "0 0 12px 0", fontWeight: "500" }}>
            📹 Camera Stream Issue
          </p>
          <p style={{ 
            color: "#856404", 
            fontSize: "12px", 
            margin: "0 0 12px 0"
          }}>
            {error}
          </p>
          <button 
            onClick={retryStream}
            style={{
              padding: "8px 16px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px"
            }}
          >
            🔄 Retry Stream
          </button>
        </div>
      )}
      
      <img
        ref={imgRef}
        src={streamUrl}
        alt="Camera Feed"
        onError={handleImageError}
        onLoad={handleImageLoad}
        style={{
          width: "100%",
          maxWidth: "640px",
          height: "auto",
          backgroundColor: "#000",
          borderRadius: "8px",
          display: loading || error ? "none" : "block"
        }}
      />
      
      {!loading && !error && (
        <p style={{ fontSize: "12px", opacity: 0.7, margin: "8px 0 0 0" }}>
          ✅ Live stream dari edge server (YOLO + tracking). Satu server saja, tidak perlu Flask terpisah.
        </p>
      )}
    </div>
  );
}
