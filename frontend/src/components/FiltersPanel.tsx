import { useMemo } from "react";
import {
  ALL_SEVERITIES,
  ALL_SOURCES,
  useMapStore,
} from "@/lib/store";
import { reporterMeta } from "@/lib/reporters";
import { severityColor, type Severity } from "@/lib/symbology";
import type { SpotSource } from "@/lib/types";

const SEVERITY_LABELS: Record<Severity, string> = {
  low: "Low",
  med: "Med",
  "med-high": "Med-high",
  high: "High",
};

function formatT(t: number): string {
  const totalMin = Math.floor(t / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `T+${m}m`;
  return `T+${h}h${m.toString().padStart(2, "0")}m`;
}

export default function FiltersPanel() {
  const events = useMapStore((s) => s.events);
  const alerts = useMapStore((s) => s.alerts);
  const timeMin = useMapStore((s) => s.timeMin);
  const timeMax = useMapStore((s) => s.timeMax);
  const severityFilter = useMapStore((s) => s.severityFilter);
  const sourceFilter = useMapStore((s) => s.sourceFilter);
  const setTimeRange = useMapStore((s) => s.setTimeRange);
  const toggleSeverity = useMapStore((s) => s.toggleSeverityFilter);
  const toggleSource = useMapStore((s) => s.toggleSourceFilter);
  const resetFilters = useMapStore((s) => s.resetFilters);

  const bounds = useMemo(() => {
    const ts: number[] = [];
    for (const e of events) ts.push(e.t);
    for (const a of alerts) ts.push(a.t);
    if (ts.length === 0) return { min: 0, max: 0 };
    return { min: Math.min(...ts), max: Math.max(...ts) };
  }, [events, alerts]);

  const lo = timeMin ?? bounds.min;
  const hi = timeMax ?? bounds.max;
  const span = Math.max(1, bounds.max - bounds.min);
  // Step: round to a sensible value (60s if span < 2h, else 5min, else 15min).
  const step = span < 7200 ? 60 : span < 86400 ? 300 : 900;

  const onLowChange = (v: number) => {
    const next = Math.min(v, hi);
    setTimeRange(next, hi);
  };
  const onHighChange = (v: number) => {
    const next = Math.max(v, lo);
    setTimeRange(lo, next);
  };

  const dirty =
    timeMin !== null ||
    timeMax !== null ||
    severityFilter.size !== ALL_SEVERITIES.length ||
    sourceFilter.size !== ALL_SOURCES.length;

  return (
    <div className="flex flex-col gap-5 px-3 py-3 text-xs text-zinc-300">
      <section className="flex flex-col gap-2">
        <header className="flex items-center justify-between">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Time
          </h3>
          {(timeMin !== null || timeMax !== null) && (
            <button
              onClick={() => setTimeRange(null, null)}
              className="text-[10px] text-zinc-500 hover:text-zinc-200"
            >
              clear
            </button>
          )}
        </header>
        <div className="flex items-center justify-between font-mono text-[11px] text-zinc-200">
          <span>{formatT(lo)}</span>
          <span className="text-zinc-500">→</span>
          <span>{formatT(hi)}</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <input
            aria-label="Earliest time"
            type="range"
            min={bounds.min}
            max={bounds.max}
            step={step}
            value={lo}
            onChange={(e) => onLowChange(Number(e.target.value))}
            className="accent-cyan-400"
          />
          <input
            aria-label="Latest time"
            type="range"
            min={bounds.min}
            max={bounds.max}
            step={step}
            value={hi}
            onChange={(e) => onHighChange(Number(e.target.value))}
            className="accent-cyan-400"
          />
        </div>
        <div className="flex justify-between font-mono text-[10px] text-zinc-500">
          <span>{formatT(bounds.min)}</span>
          <span>{formatT(bounds.max)}</span>
        </div>
      </section>

      <section className="flex flex-col gap-1.5">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Severity
        </h3>
        {ALL_SEVERITIES.map((s) => {
          const on = severityFilter.has(s);
          return (
            <button
              key={s}
              onClick={() => toggleSeverity(s)}
              className={`flex items-center gap-2 rounded px-2 py-1.5 text-left transition-colors ${
                on
                  ? "bg-zinc-800/40 text-zinc-100"
                  : "text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300"
              }`}
            >
              <span
                className={`inline-block h-2.5 w-2.5 rounded-sm border ${
                  on ? "border-cyan-300" : "border-zinc-600"
                }`}
                style={{
                  backgroundColor: on ? severityColor(s) : "transparent",
                }}
              />
              {SEVERITY_LABELS[s]}
            </button>
          );
        })}
      </section>

      <section className="flex flex-col gap-1.5">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Reporter
        </h3>
        {ALL_SOURCES.map((src: SpotSource) => {
          const meta = reporterMeta(src);
          const on = sourceFilter.has(src);
          return (
            <button
              key={src}
              onClick={() => toggleSource(src)}
              className={`flex items-center gap-2 rounded px-2 py-1.5 text-left transition-colors ${
                on
                  ? "bg-zinc-800/40 text-zinc-100"
                  : "text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300"
              }`}
            >
              <span
                className={`inline-block h-2.5 w-2.5 rounded-sm border ${
                  on
                    ? "border-cyan-300 bg-cyan-400/70"
                    : "border-zinc-600 bg-transparent"
                }`}
              />
              <span className="font-mono text-[11px] text-zinc-300">
                {meta.glyph}
              </span>
              {meta.label}
            </button>
          );
        })}
      </section>

      {dirty && (
        <button
          onClick={resetFilters}
          className="rounded border border-zinc-700 px-2 py-1.5 text-[11px] text-zinc-300 hover:border-cyan-500/60 hover:text-cyan-200"
        >
          Reset all filters
        </button>
      )}
    </div>
  );
}
