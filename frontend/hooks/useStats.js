"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { fetchSummary, fetchDaily } from "@/services/stats.service";
import { todayISO } from "@/lib/utils";
import { POLL_INTERVAL } from "@/lib/constants";

/**
 * Hook that polls stats every POLL_INTERVAL ms and exposes
 * summary + daily data, plus manual reload.
 */
export function useStats() {
  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [error, setError] = useState("");
  const day = useMemo(() => todayISO(), []);

  const load = useCallback(async () => {
    setError("");
    try {
      const [summaryData, dailyData] = await Promise.all([
        fetchSummary(day).catch(() => null),
        fetchDaily(day),
      ]);
      if (summaryData) setSummary(summaryData);
      setDaily(dailyData);
    } catch (e) {
      setError(e.message || "Failed to load stats");
    }
  }, [day]);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_INTERVAL);
    return () => clearInterval(t);
  }, [load]);

  const totalEvents = summary?.total_events || daily.reduce((s, r) => s + r.total_events, 0);
  const uniqueVisitors = summary?.unique_visitors || daily.reduce((s, r) => s + r.unique_visitors, 0);
  const totalIn = summary?.total_in || daily.reduce((s, r) => s + r.total_in, 0);
  const totalOut = summary?.total_out || daily.reduce((s, r) => s + r.total_out, 0);

  return {
    day,
    summary,
    daily,
    totalEvents,
    uniqueVisitors,
    totalIn,
    totalOut,
    error,
    reload: load,
  };
}
