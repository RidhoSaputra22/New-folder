"use client";

import Table from "@/components/ui/Table";
import Section from "@/components/ui/Section";

/**
 * Per-camera daily stats table.
 */
export default function StatsTable({ daily = [] }) {
  const columns = ["Tanggal", "Camera ID", "Total Event", "Unik", "Masuk", "Keluar"];

  const rows = daily.map((r) => [
    r.stat_date,
    r.camera_id,
    r.total_events,
    <strong key="u">{r.unique_visitors}</strong>,
    r.total_in,
    r.total_out,
  ]);

  return (
    <Section title="Statistik per Kamera">
      <p className="text-sm opacity-70 mb-3">
        Data diperbarui otomatis setiap 5 detik.
      </p>
      <Table
        columns={columns}
        rows={rows}
        emptyText="Belum ada data. Jalankan edge worker (mode FAKE atau REAL)."
      />
    </Section>
  );
}
