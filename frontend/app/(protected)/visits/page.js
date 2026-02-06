"use client";

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchEvents, fetchVisitorDaily } from "@/services/stats.service";
import { todayISO } from "@/lib/utils";
import Table from "@/components/ui/Table";
import Section from "@/components/ui/Section";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";

export default function VisitsPage() {
  const { user } = useAuth();
  const today = todayISO();

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [events, setEvents] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("events"); // "events" | "visitors"

  // Only admin can access this page
  if (user?.role !== "ADMIN") {
    return (
      <>
        <h1>Data Kunjungan</h1>
        <Alert variant="error">Hanya Admin yang bisa mengakses halaman ini.</Alert>
      </>
    );
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [eventsData, visitorsData] = await Promise.all([
        fetchEvents(fromDate, toDate).catch(() => []),
        fetchVisitorDaily(fromDate, toDate).catch(() => []),
      ]);
      setEvents(eventsData);
      setVisitors(visitorsData);
    } catch (e) {
      setError(e.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    load();
  }, [load]);

  const eventColumns = ["ID", "Camera", "Area", "Waktu", "Track ID", "Visitor Key", "Arah", "Confidence"];
  const eventRows = events.map((e) => [
    e.event_id,
    e.camera_id,
    e.area_id,
    new Date(e.event_time).toLocaleString("id-ID"),
    e.track_id || "-",
    <span key="vk" className="font-mono text-xs">{e.visitor_key?.substring(0, 16)}...</span>,
    <span key="d" className={`badge badge-sm ${e.direction === "IN" ? "badge-success" : e.direction === "OUT" ? "badge-error" : "badge-ghost"}`}>
      {e.direction || "-"}
    </span>,
    e.confidence_avg ? (e.confidence_avg * 100).toFixed(1) + "%" : "-",
  ]);

  const visitorColumns = ["ID", "Tanggal", "Visitor Key", "Pertama Terlihat", "Terakhir Terlihat", "Catatan"];
  const visitorRows = visitors.map((v) => [
    v.visitor_daily_id,
    v.visit_date,
    <span key="vk" className="font-mono text-xs">{v.visitor_key?.substring(0, 16)}...</span>,
    new Date(v.first_seen_at).toLocaleString("id-ID"),
    new Date(v.last_seen_at).toLocaleString("id-ID"),
    v.notes || "-",
  ]);

  return (
    <>
      <h1>Data Kunjungan</h1>
      <p className="text-sm opacity-70">
        Lihat dan kelola data event kunjungan dan pengunjung unik harian.
      </p>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Date filter */}
      <Section title="Filter Periode">
        <div className="flex flex-wrap items-end gap-3">
          <div className="form-control">
            <label className="label py-0">
              <span className="label-text text-xs">Dari</span>
            </label>
            <input
              type="date"
              className="input input-bordered input-sm w-40"
              value={fromDate}
              max={toDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="form-control">
            <label className="label py-0">
              <span className="label-text text-xs">Sampai</span>
            </label>
            <input
              type="date"
              className="input input-bordered input-sm w-40"
              value={toDate}
              min={fromDate}
              max={today}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <Button variant="primary" loading={loading} onClick={load} className="btn-sm">
            Muat Data
          </Button>
        </div>
      </Section>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <div className="card bg-base-100 border border-base-300 p-4 text-center">
          <div className="text-xs opacity-70">Total Event</div>
          <div className="text-2xl font-bold">{events.length}</div>
        </div>
        <div className="card bg-base-100 border border-success bg-success/5 p-4 text-center">
          <div className="text-xs opacity-70">Pengunjung Unik</div>
          <div className="text-2xl font-bold text-success">{visitors.length}</div>
        </div>
        <div className="card bg-base-100 border border-base-300 p-4 text-center">
          <div className="text-xs opacity-70">Masuk (IN)</div>
          <div className="text-2xl font-bold">{events.filter((e) => e.direction === "IN").length}</div>
        </div>
        <div className="card bg-base-100 border border-base-300 p-4 text-center">
          <div className="text-xs opacity-70">Keluar (OUT)</div>
          <div className="text-2xl font-bold">{events.filter((e) => e.direction === "OUT").length}</div>
        </div>
      </div>

      {/* Tab switch */}
      <div className="tabs tabs-boxed mt-6 w-fit">
        <button
          className={`tab ${tab === "events" ? "tab-active" : ""}`}
          onClick={() => setTab("events")}
        >
          Event Kunjungan ({events.length})
        </button>
        <button
          className={`tab ${tab === "visitors" ? "tab-active" : ""}`}
          onClick={() => setTab("visitors")}
        >
          Pengunjung Unik ({visitors.length})
        </button>
      </div>

      {/* Tables */}
      {tab === "events" && (
        <Section title={`Event Kunjungan (${fromDate} s/d ${toDate})`}>
          <Table columns={eventColumns} rows={eventRows} emptyText="Belum ada event kunjungan pada periode ini." />
        </Section>
      )}

      {tab === "visitors" && (
        <Section title={`Pengunjung Unik Harian (${fromDate} s/d ${toDate})`}>
          <Table columns={visitorColumns} rows={visitorRows} emptyText="Belum ada data pengunjung unik pada periode ini." />
        </Section>
      )}
    </>
  );
}
