import { useMapStore } from "@/lib/store";
import { severityColor } from "@/lib/symbology";
import { reporterMeta } from "@/lib/reporters";
import { getMapInstance } from "@/lib/mapInstance";
import type { SpotEvent } from "@/lib/types";

function formatT(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `T+${m}:${s.toString().padStart(2, "0")}`;
}

export default function SpotFeed() {
  const events = useMapStore((s) => s.events);
  const selection = useMapStore((s) => s.selection);
  const setSelection = useMapStore((s) => s.setSelection);

  const sorted = [...events].sort((a, b) => b.t - a.t);

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
          No spot reports yet.
        </div>
      )}
      {sorted.map((e) => {
        const active = selection?.kind === "spot" && selection.id === e.id;
        const meta = reporterMeta(e.source);
        const firstLine = e.salute.split("\n")[0] ?? e.salute;
        return (
          <button
            key={e.id}
            onClick={() => onClick(e)}
            className={`flex w-full flex-col gap-1 border-b border-zinc-800/70 px-3 py-2 text-left transition-colors ${
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
                {formatT(e.t)}
              </span>
            </div>
            <div className="line-clamp-2 font-mono text-xs leading-snug text-zinc-200">
              {firstLine}
            </div>
            {e.quote && (
              <div className="line-clamp-1 text-[10px] italic text-zinc-500">
                “{e.quote}”
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
