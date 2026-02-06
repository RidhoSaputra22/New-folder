"use client";

import { useState, useEffect } from "react";
import { createArea, updateArea } from "@/services/camera.service";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import Section from "@/components/ui/Section";

const DIRECTION_OPTIONS = [
  { value: "BOTH", label: "BOTH (Masuk & Keluar)" },
  { value: "IN", label: "IN (Masuk saja)" },
  { value: "OUT", label: "OUT (Keluar saja)" },
];

/**
 * Form to create / edit a counting area (ROI) for a camera.
 */
export default function CountingAreaForm({ areas = [], onSaved }) {
  const [areaName, setAreaName] = useState("Gate Masuk");
  const [roiText, setRoiText] = useState("[[50,50],[1230,50],[1230,670],[50,670]]");
  const [directionMode, setDirectionMode] = useState("BOTH");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    if (areas.length > 0) {
      const a = areas[0];
      setAreaName(a.name || "");
      setRoiText(JSON.stringify(a.roi_polygon || []));
      setDirectionMode(a.direction_mode || "BOTH");
    }
  }, [areas]);

  async function handleSave() {
    setSaving(true);
    setError("");
    setOk("");

    let roi = null;
    try {
      roi = roiText.trim() ? JSON.parse(roiText) : null;
    } catch {
      setError("ROI JSON invalid. Contoh: [[50,50],[1230,50],[1230,670],[50,670]]");
      setSaving(false);
      return;
    }

    try {
      if (areas.length > 0) {
        await updateArea(areas[0].area_id, {
          name: areaName,
          roi_polygon: roi,
          direction_mode: directionMode,
        });
      } else {
        await createArea({
          camera_id: 1,
          name: areaName,
          roi_polygon: roi,
          direction_mode: directionMode,
        });
      }
      setOk("Counting area saved. Edge will refresh config automatically.");
      onSaved?.();
    } catch (e) {
      setError(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Area Hitung (Counting Area)">
      <div className="grid gap-4">
        <Input
          label="Nama Area"
          value={areaName}
          onChange={(e) => setAreaName(e.target.value)}
          placeholder="Gate Masuk"
        />
        <Select
          label="Direction Mode"
          options={DIRECTION_OPTIONS}
          value={directionMode}
          onChange={(e) => setDirectionMode(e.target.value)}
        />
        <Textarea
          label="ROI Polygon (JSON) — Koordinat pixel [[x,y], ...]"
          value={roiText}
          onChange={(e) => setRoiText(e.target.value)}
          rows={4}
          placeholder='[[50,50],[1230,50],[1230,670],[50,670]]'
        />
        <Button variant="secondary" loading={saving} onClick={handleSave}>
          Save Counting Area
        </Button>

        {error && <p className="text-error text-sm">{error}</p>}
        {ok && <p className="text-success text-sm">{ok}</p>}

        <p className="text-xs opacity-70">
          ROI menggunakan koordinat pixel. Untuk akurat, ambil screenshot frame kamera
          lalu tentukan titik polygon. Default ROI sudah mencakup hampir seluruh frame 1280x720.
        </p>
      </div>
    </Section>
  );
}
