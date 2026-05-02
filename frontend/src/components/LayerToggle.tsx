import { useState } from "react";
import { useMapStore } from "@/lib/store";
import type { LayerId } from "@/lib/types";

const GROUPS: { id: LayerId; label: string }[] = [
  { id: "sensors", label: "Sensors" },
  { id: "spots", label: "SPOTs" },
  { id: "alerts", label: "Alerts" },
  { id: "nais", label: "NAIs" },
  { id: "drone-orbit", label: "Drone orbits" },
  { id: "tracks", label: "Tracks" },
  { id: "inferred", label: "Inferred geometry" },
];

export default function LayerToggle() {
  const visibleLayers = useMapStore((s) => s.visibleLayers);
  const toggleLayer = useMapStore((s) => s.toggleLayer);
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-auto absolute right-3 top-14 z-30 flex w-44 flex-col rounded-lg border border-zinc-700/70 bg-zinc-900/85 shadow-lg backdrop-blur">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between border-b border-zinc-700/40 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-300 hover:bg-zinc-800/60"
      >
        <span>Layers</span>
        <span className="text-zinc-500">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-0.5 p-1">
          {GROUPS.map((g) => {
            const on = visibleLayers.has(g.id);
            return (
              <button
                key={g.id}
                onClick={() => toggleLayer(g.id)}
                className={`flex items-center gap-2 rounded px-2 py-1 text-left text-xs ${
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
        </div>
      )}
    </div>
  );
}
