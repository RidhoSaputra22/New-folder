"use client";

import { useState } from "react";
import { resetDatabase } from "@/services/stats.service";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import Section from "@/components/ui/Section";

/**
 * Admin-only section that wipes visitor data.
 */
export default function ResetSection({ onResetDone }) {
  const [status, setStatus] = useState(""); // "" | "loading" | "success" | "error"
  const [error, setError] = useState("");

  async function handleReset() {
    if (
      !confirm(
        "PERINGATAN: Ini akan menghapus SEMUA data pengunjung (visitor_daily, visit_events, daily_stats). Yakin ingin melanjutkan?"
      )
    )
      return;

    setStatus("loading");
    setError("");

    try {
      await resetDatabase();
      setStatus("success");
      setTimeout(() => {
        setStatus("");
        onResetDone?.();
      }, 2000);
    } catch (e) {
      setError(e.message || "Error reset database");
      setStatus("error");
    }
  }

  return (
    <Section title="Reset Database (Admin Only)" danger>
      <p className="opacity-80 mb-4 text-sm">
        Menghapus SEMUA data pengunjung (visitor_daily, visit_events, daily_stats).
        Data kamera dan user tidak akan terhapus.
      </p>

      <Button
        variant={status === "success" ? "success" : "danger"}
        loading={status === "loading"}
        onClick={handleReset}
      >
        {status === "success" ? "Reset Berhasil!" : "Reset Database"}
      </Button>

      {status === "error" && <Alert variant="error">{error}</Alert>}
      {status === "success" && (
        <Alert variant="success">
          Database berhasil direset. Data sedang dimuat ulang...
        </Alert>
      )}
    </Section>
  );
}
