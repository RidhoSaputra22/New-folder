"use client";

import { API_BASE } from "@/lib/constants";
import Section from "@/components/ui/Section";

/**
 * Shows CSV export URL / instructions.
 */
export default function ExportSection({ day }) {
  const exportUrl = `${API_BASE}/api/reports/csv?from_day=${day}&to_day=${day}`;

  return (
    <Section title="Export Laporan (CSV)">
      <p className="text-sm opacity-70 mb-3">
        Download laporan statistik pengunjung:
      </p>
      <code className="block bg-base-200 p-3 rounded-lg text-sm break-all">
        GET {exportUrl}
      </code>
    </Section>
  );
}
