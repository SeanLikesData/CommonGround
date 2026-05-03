import { passesSpotFilter, useMapStore } from "@/lib/store";
import { severityColor } from "@/lib/symbology";
import { reporterMeta } from "@/lib/reporters";
import { getMapInstance } from "@/lib/mapInstance";
import { formatDTG } from "@/lib/time";
import type { SpotEvent } from "@/lib/types";

const SALUTE_LABELS: Record<string, string> = {
  S: "Size",
  A: "Activity",
  L: "Location",
  U: "Unit",
  T: "Time",
  E: "Equipment",
};

interface SaluteField {
  key: string;
  label: string;
  value: string;
}

// Parse the seed's `;`-delimited "S: …; A: …" form. Returns null if it doesn't
// look like SALUTE so the caller can fall back to rendering the raw string.
function parseSalute(raw: string): SaluteField[] | null {
  const parts = raw.split(/;\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const fields: SaluteField[] = [];
  for (const part of parts) {
    const m = part.match(/^([A-Za-z])\s*:\s*(.+)$/);
    if (!m) return null;
    const key = m[1].toUpperCase();
    const label = SALUTE_LABELS[key];
    if (!label) return null;
    fields.push({ key, label, value: m[2].trim() });
  }
  return fields;
}

export default function SpotFeed() {
  const events = useMapStore((s) => s.events);
  const selection = useMapStore((s) => s.selection);
  const setSelection = useMapStore((s) => s.setSelection);
  const timeMin = useMapStore((s) => s.timeMin);
  const timeMax = useMapStore((s) => s.timeMax);
  const severityFilter = useMapStore((s) => s.severityFilter);
  const sourceFilter = useMapStore((s) => s.sourceFilter);
  const cursorT = useMapStore((s) => s.cursorT);

  const filterState = { timeMin, timeMax, severityFilter, sourceFilter, cursorT };
  const sorted = events
    .filter((e) => passesSpotFilter(e, filterState))
    .sort((a, b) => b.t - a.t);

  const onClick = (e: SpotEvent) => {
    setSelection({ kind: "spot", id: e.id });
    const map = getMapInstance();
    if (map) {
      map.flyTo({ center: e.location, zoom: 14, speed: 0.8 });
    }
  };

  return (
    <div className="flex h-full flex-col">
      {sorted.length === 0 && (
        <div className="px-3 py-6 text-center text-xs text-zinc-500">
          {events.length === 0
            ? "No spot reports yet."
            : "No spot reports match the current filters."}
        </div>
      )}
      {sorted.map((e) => {
        const active = selection?.kind === "spot" && selection.id === e.id;
        const meta = reporterMeta(e.source);
        const fields = parseSalute(e.salute);
        return (
          <button
            key={e.id}
            onClick={() => onClick(e)}
            className={`flex w-full flex-col gap-2 border-b border-zinc-800/70 px-3 py-3 text-left transition-colors ${
              active ? "bg-cyan-500/10" : "hover:bg-zinc-800/60"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: severityColor(e.severity) }}
              />
              <span
                className="text-[11px] leading-none"
                style={{ color: severityColor(e.severity) }}
              >
                {meta.glyph}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-zinc-400">
                {meta.label}
                {e.sensorId ? ` · ${e.sensorId}` : ""}
              </span>
              <span className="ml-auto font-mono text-[10px] text-zinc-500">
                {formatDTG(e.t)}
              </span>
            </div>

            {fields ? (
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs leading-snug">
                {fields.map((f) => (
                  <div key={f.key} className="contents">
                    <dt className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                      {f.label}
                    </dt>
                    <dd className="text-zinc-200">{f.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className="whitespace-pre-wrap font-mono text-xs leading-snug text-zinc-200">
                {e.salute}
              </div>
            )}

            {e.quote && (
              <div className="border-l-2 border-cyan-400/50 pl-2 text-[11px] italic leading-snug text-zinc-400">
                “{e.quote}”
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
