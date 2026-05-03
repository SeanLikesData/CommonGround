import {
  ALL_SEVERITIES,
  ALL_SOURCES,
  useMapStore,
} from "@/lib/store";
import { reporterMeta } from "@/lib/reporters";
import { severityColor, type Severity } from "@/lib/symbology";
import type { LayerId, SpotSource } from "@/lib/types";

const LAYER_GROUPS: { id: LayerId; label: string }[] = [
  { id: "sensors", label: "Sensors" },
  { id: "spots", label: "SPOTs" },
  { id: "alerts", label: "Alerts" },
  { id: "nais", label: "NAIs" },
  { id: "drone-orbit", label: "Drone orbits" },
  { id: "tracks", label: "Tracks" },
  { id: "inferred", label: "Inferred geometry" },
];

const SEVERITY_LABELS: Record<Severity, string> = {
  low: "Low",
  med: "Med",
  "med-high": "Med-high",
  high: "High",
};

export default function FiltersPanel() {
  const severityFilter = useMapStore((s) => s.severityFilter);
  const sourceFilter = useMapStore((s) => s.sourceFilter);
  const toggleSeverity = useMapStore((s) => s.toggleSeverityFilter);
  const toggleSource = useMapStore((s) => s.toggleSourceFilter);
  const resetFilters = useMapStore((s) => s.resetFilters);
  const visibleLayers = useMapStore((s) => s.visibleLayers);
  const toggleLayer = useMapStore((s) => s.toggleLayer);

  const dirty =
    severityFilter.size !== ALL_SEVERITIES.length ||
    sourceFilter.size !== ALL_SOURCES.length;

  return (
    <div className="flex flex-col gap-5 px-3 py-3 text-xs text-zinc-300">
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

      <section className="flex flex-col gap-1.5">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Layers
        </h3>
        {LAYER_GROUPS.map((g) => {
          const on = visibleLayers.has(g.id);
          return (
            <button
              key={g.id}
              onClick={() => toggleLayer(g.id)}
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
              {g.label}
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
