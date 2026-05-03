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

  return (
    <div className="flex flex-col gap-0.5 p-2">
      {GROUPS.map((g) => {
        const on = visibleLayers.has(g.id);
        return (
          <button
            key={g.id}
            onClick={() => toggleLayer(g.id)}
            className={`flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
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
  );
}
