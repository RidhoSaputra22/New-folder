"use client";

import { useAuth } from "@/context/AuthContext";
import { useStats } from "@/hooks/useStats";

import StatsGrid from "@/components/dashboard/StatsGrid";
import CameraView from "@/components/dashboard/CameraView";
import StatsTable from "@/components/dashboard/StatsTable";
import ExportSection from "@/components/dashboard/ExportSection";
import ResetSection from "@/components/dashboard/ResetSection";
import Alert from "@/components/ui/Alert";

export default function DashboardPage() {
  const { user } = useAuth();
  const { day, daily, totalEvents, uniqueVisitors, totalIn, totalOut, error, reload } = useStats();

  return (
    <>
      <h1>Dashboard Monitoring Pengunjung</h1>

      {error && <Alert variant="error">{error}</Alert>}

      <StatsGrid
        day={day}
        totalEvents={totalEvents}
        uniqueVisitors={uniqueVisitors}
        totalIn={totalIn}
        totalOut={totalOut}
      />

      <CameraView />

      <StatsTable daily={daily} />

      <ExportSection day={day} />

      {user?.role === "ADMIN" && <ResetSection onResetDone={reload} />}
    </>
  );
}
