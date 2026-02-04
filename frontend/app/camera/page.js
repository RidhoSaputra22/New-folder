"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function CameraConfig() {
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [camera, setCamera] = useState(null);
  const [areas, setAreas] = useState([]);

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
  
  // Counting area form
  const [areaName, setAreaName] = useState("Gate Masuk");
  const [roiText, setRoiText] = useState(`[[50,50],[1230,50],[1230,670],[50,670]]`);
  const [directionMode, setDirectionMode] = useState("BOTH");

  async function load() {
    setErr(""); setOkMsg("");
    const token = localStorage.getItem("token");
    if (!token) { setErr("No token. Please login."); return; }
    const headers = { Authorization: `Bearer ${token}` };

    try {
      // Load camera
      const res = await fetch(`${API_BASE}/api/cameras/1`, { headers });
      if (!res.ok) throw new Error("Failed to load camera (id=1).");
      const data = await res.json();
      setCamera(data);
      setName(data.name || "");
      setLocation(data.location || "");
      setStreamUrl(data.stream_url || "");

      // Load counting areas
      const areasRes = await fetch(`${API_BASE}/api/cameras/1/areas`, { headers });
      if (areasRes.ok) {
        const areasData = await areasRes.json();
        setAreas(areasData);
        if (areasData.length > 0) {
          const firstArea = areasData[0];
          setAreaName(firstArea.name || "");
          setRoiText(JSON.stringify(firstArea.roi_polygon || []));
          setDirectionMode(firstArea.direction_mode || "BOTH");
        }
      }
    } catch (e) {
      setErr(e.message || "Error");
    }
  }

  useEffect(() => { load(); }, []);

  async function saveCamera() {
    setErr(""); setOkMsg("");
    const token = localStorage.getItem("token");
    if (!token) { setErr("No token. Please login."); return; }
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    };

    try {
      const res = await fetch(`${API_BASE}/api/cameras/1`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ 
          name: name || null, 
          location: location || null,
          stream_url: streamUrl || null 
        })
      });
      if (!res.ok) throw new Error("Save failed (need admin role).");
      setOkMsg("Camera saved. Edge will refresh config automatically.");
      await load();
    } catch (e) {
      setErr(e.message || "Error");
    }
  }

  async function saveArea() {
    setErr(""); setOkMsg("");
    const token = localStorage.getItem("token");
    if (!token) { setErr("No token. Please login."); return; }
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    };

    let roi = null;
    try {
      roi = roiText.trim() ? JSON.parse(roiText) : null;
    } catch {
      setErr("ROI JSON invalid. Example: [[50,50],[1230,50],[1230,670],[50,670]]");
      return;
    }

    try {
      if (areas.length > 0) {
        // Update existing area
        const areaId = areas[0].area_id;
        const res = await fetch(`${API_BASE}/api/areas/${areaId}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ 
            name: areaName,
            roi_polygon: roi,
            direction_mode: directionMode
          })
        });
        if (!res.ok) throw new Error("Save area failed (need admin role).");
      } else {
        // Create new area
        const res = await fetch(`${API_BASE}/api/areas`, {
          method: "POST",
          headers,
          body: JSON.stringify({ 
            camera_id: 1,
            name: areaName,
            roi_polygon: roi,
            direction_mode: directionMode
          })
        });
        if (!res.ok) throw new Error("Create area failed (need admin role).");
      }
      setOkMsg("Counting area saved. Edge will refresh config automatically.");
      await load();
    } catch (e) {
      setErr(e.message || "Error");
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 800 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>Konfigurasi Kamera</h1>
        <Link href="/dashboard">Back to Dashboard</Link>
      </div>

      {err ? <p style={{ color: "crimson" }}>{err}</p> : null}
      {okMsg ? <p style={{ color: "green" }}>{okMsg}</p> : null}

      {/* Camera Settings */}
      <section style={{ marginTop: 20, padding: 16, border: "1px solid #e5e5e5", borderRadius: 10 }}>
        <h2>📷 Camera Settings (ID=1)</h2>
        <div style={{ display: "grid", gap: 12 }}>
          <label>
            Nama Kamera
            <input value={name} onChange={(e) => setName(e.target.value)} 
              style={{ width: "100%", padding: 10, marginTop: 6 }} 
              placeholder="Kamera Utama" />
          </label>

          <label>
            Lokasi
            <input value={location} onChange={(e) => setLocation(e.target.value)} 
              style={{ width: "100%", padding: 10, marginTop: 6 }} 
              placeholder="Pintu Masuk Utama" />
          </label>

          <label>
            Stream URL
            <input value={streamUrl} onChange={(e) => setStreamUrl(e.target.value)} 
              style={{ width: "100%", padding: 10, marginTop: 6 }} 
              placeholder="0 (webcam) atau rtsp://ip:port/stream atau http://..." />
          </label>

          <button onClick={saveCamera} style={{ padding: 12, cursor: "pointer", backgroundColor: "#4CAF50", color: "white", border: "none", borderRadius: 6 }}>
            Save Camera
          </button>
        </div>
      </section>

      {/* Counting Area Settings */}
      <section style={{ marginTop: 20, padding: 16, border: "1px solid #e5e5e5", borderRadius: 10 }}>
        <h2>📍 Area Hitung (Counting Area)</h2>
        <div style={{ display: "grid", gap: 12 }}>
          <label>
            Nama Area
            <input value={areaName} onChange={(e) => setAreaName(e.target.value)} 
              style={{ width: "100%", padding: 10, marginTop: 6 }} 
              placeholder="Gate Masuk" />
          </label>

          <label>
            Direction Mode
            <select value={directionMode} onChange={(e) => setDirectionMode(e.target.value)}
              style={{ width: "100%", padding: 10, marginTop: 6 }}>
              <option value="BOTH">BOTH (Masuk & Keluar)</option>
              <option value="IN">IN (Masuk saja)</option>
              <option value="OUT">OUT (Keluar saja)</option>
            </select>
          </label>

          <label>
            ROI Polygon (JSON) - Koordinat pixel [[x,y], ...]
            <textarea value={roiText} onChange={(e) => setRoiText(e.target.value)} rows={4}
              style={{ width: "100%", padding: 10, marginTop: 6, fontFamily: "monospace" }} 
              placeholder='[[50,50],[1230,50],[1230,670],[50,670]]' />
          </label>

          <button onClick={saveArea} style={{ padding: 12, cursor: "pointer", backgroundColor: "#2196F3", color: "white", border: "none", borderRadius: 6 }}>
            Save Counting Area
          </button>

          <p style={{ opacity: 0.7, fontSize: 12 }}>
            💡 ROI menggunakan koordinat pixel. Untuk akurat, ambil screenshot frame kamera lalu tentukan titik polygon.
            Default ROI sudah mencakup hampir seluruh frame 1280x720.
          </p>
        </div>
      </section>

      {/* Current Config Preview */}
      <section style={{ marginTop: 20, padding: 16, border: "1px solid #e5e5e5", borderRadius: 10 }}>
        <h2>📄 Current Configuration</h2>
        {camera ? (
          <pre style={{ padding: 12, background: "#f6f6f6", borderRadius: 10, overflowX: "auto", fontSize: 12 }}>
{`Camera:
${JSON.stringify(camera, null, 2)}

Counting Areas:
${JSON.stringify(areas, null, 2)}`}
          </pre>
        ) : <p>Loading...</p>}
      </section>
    </main>
  );
}
