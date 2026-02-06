"use client";

import Card from "@/components/ui/Card";

/**
 * Top-level stats cards for the dashboard.
 */
export default function StatsGrid({ day, totalEvents, uniqueVisitors, totalIn, totalOut }) {
  return (
    <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
      <Card title="Tanggal (Hari ini)" value={day} />
      <Card title="Total Event" value={String(totalEvents)} subtitle="Kejadian kunjungan" />
      <Card title="Pengunjung Unik" value={String(uniqueVisitors)} subtitle="Unik per hari" highlight />
      <Card title="Masuk" value={String(totalIn)} />
      <Card title="Keluar" value={String(totalOut)} />
    </section>
  );
}
