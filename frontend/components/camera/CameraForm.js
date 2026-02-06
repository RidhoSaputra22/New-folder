"use client";

import { useState, useEffect } from "react";
import { updateCamera } from "@/services/camera.service";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Section from "@/components/ui/Section";

/**
 * Form to edit camera settings (name, location, stream_url).
 */
export default function CameraForm({ camera, onSaved }) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    if (camera) {
      setName(camera.name || "");
      setLocation(camera.location || "");
      setStreamUrl(camera.stream_url || "");
    }
  }, [camera]);

  async function handleSave() {
    setSaving(true);
    setError("");
    setOk("");
    try {
      await updateCamera(1, {
        name: name || null,
        location: location || null,
        stream_url: streamUrl || null,
      });
      setOk("Camera saved. Edge will refresh config automatically.");
      onSaved?.();
    } catch (e) {
      setError(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Camera Settings (ID=1)">
      <div className="grid gap-4">
        <Input
          label="Nama Kamera"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Kamera Utama"
        />
        <Input
          label="Lokasi"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Pintu Masuk Utama"
        />
        <Input
          label="Stream URL"
          value={streamUrl}
          onChange={(e) => setStreamUrl(e.target.value)}
          placeholder="0 (webcam) atau rtsp://ip:port/stream atau http://..."
        />
        <Button variant="primary" loading={saving} onClick={handleSave}>
          Save Camera
        </Button>

        {error && <p className="text-error text-sm">{error}</p>}
        {ok && <p className="text-success text-sm">{ok}</p>}
      </div>
    </Section>
  );
}
