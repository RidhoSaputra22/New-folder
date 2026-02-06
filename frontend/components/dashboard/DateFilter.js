"use client";

import Section from "@/components/ui/Section";
import Button from "@/components/ui/Button";

/**
 * Date range filter component for dashboard.
 * Allows switching between "Hari Ini" and custom date range.
 */
export default function DateFilter({
  filterMode,
  setFilterMode,
  filterFrom,
  setFilterFrom,
  filterTo,
  setFilterTo,
  today,
}) {
  return (
    <Section title="Filter Periode">
      <div className="flex flex-wrap items-end gap-3">
        {/* Mode toggle */}
        <div className="flex gap-1">
          <button
            className={`btn btn-sm ${filterMode === "today" ? "btn-success" : "btn-ghost"}`}
            onClick={() => {
              setFilterMode("today");
              setFilterFrom(today);
              setFilterTo(today);
            }}
          >
            Hari Ini
          </button>
          <button
            className={`btn btn-sm ${filterMode === "range" ? "btn-success" : "btn-ghost"}`}
            onClick={() => setFilterMode("range")}
          >
            Rentang Tanggal
          </button>
        </div>

        {/* Date range inputs */}
        {filterMode === "range" && (
          <>
            <div className="form-control">
              <label className="label py-0">
                <span className="label-text text-xs">Dari</span>
              </label>
              <input
                type="date"
                className="input input-bordered input-sm w-40"
                value={filterFrom}
                max={filterTo || today}
                onChange={(e) => setFilterFrom(e.target.value)}
              />
            </div>
            <div className="form-control">
              <label className="label py-0">
                <span className="label-text text-xs">Sampai</span>
              </label>
              <input
                type="date"
                className="input input-bordered input-sm w-40"
                value={filterTo}
                min={filterFrom}
                max={today}
                onChange={(e) => setFilterTo(e.target.value)}
              />
            </div>
          </>
        )}
      </div>
    </Section>
  );
}
