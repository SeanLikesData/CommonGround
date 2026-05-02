import { useMapStore } from "@/lib/store";
import { severityColor } from "@/lib/symbology";
import { getMapInstance } from "@/lib/mapInstance";
import type { AlertEvent } from "@/lib/types";

function formatT(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `T+${m}:${s.toString().padStart(2, "0")}`;
}

export default function AlertFeed() {
  const alerts = useMapStore((s) => s.alerts);
  const selection = useMapStore((s) => s.selection);
  const setSelection = useMapStore((s) => s.setSelection);

  const sorted = [...alerts].sort((a, b) => b.t - a.t);

  const onClick = (a: AlertEvent) => {
    setSelection({ kind: "alert", id: a.id });
    const map = getMapInstance();
    if (map) {
      map.flyTo({ center: a.location, zoom: 14, speed: 0.8 });
    }
  };

  return (
    <div className="pointer-events-auto absolute left-3 top-28 z-30 flex max-h-[calc(100vh-14rem)] w-80 flex-col overflow-hidden rounded-lg border border-zinc-700/70 bg-zinc-900/85 shadow-lg backdrop-blur">
      <div className="flex items-center justify-between border-b border-zinc-700/70 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-300">
        <span>Alerts</span>
        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
          {alerts.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-zinc-500">
            No alerts yet.
          </div>
        )}
        {sorted.map((a) => {
          const active = selection?.kind === "alert" && selection.id === a.id;
          return (
            <button
              key={a.id}
              onClick={() => onClick(a)}
              className={`flex w-full flex-col gap-1 border-b border-zinc-800/70 px-3 py-2 text-left transition-colors ${
                active ? "bg-cyan-500/10" : "hover:bg-zinc-800/60"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: severityColor(a.severity) }}
                />
                <span className="text-[10px] uppercase tracking-wider text-zinc-400">
                  {a.severity}
                </span>
                <span className="ml-auto font-mono text-[10px] text-zinc-500">
                  {formatT(a.t)}
                </span>
              </div>
              <div className="text-sm leading-snug text-zinc-100">{a.summary}</div>
              <div className="text-[10px] text-zinc-500">
                {a.contributingSpotIds.length} contributing reports ·{" "}
                {a.citedMemoryIds.length} cited memories
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
