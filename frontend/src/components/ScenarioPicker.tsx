import { useMapStore } from "@/lib/store";

const SCENARIOS = [
  { id: "wadi_hamrin", label: "Wadi Hamrin", duration: "90 min" },
  { id: "patrol_hvs", label: "Patrol → HVS", duration: "14 days" },
] as const;

export default function ScenarioPicker() {
  const scenario = useMapStore((s) => s.scenario);
  const setScenario = useMapStore((s) => s.setScenario);

  return (
    <div className="pointer-events-auto absolute left-3 top-12 z-30 flex gap-1 rounded-lg border border-zinc-700/70 bg-zinc-900/85 p-1 shadow-lg backdrop-blur">
      {SCENARIOS.map((s) => {
        const active = scenario === s.id;
        return (
          <button
            key={s.id}
            onClick={() => setScenario(s.id)}
            className={`flex flex-col items-start rounded px-2 py-1 text-left text-[11px] leading-tight transition-colors ${
              active
                ? "bg-cyan-500/25 text-cyan-100"
                : "text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200"
            }`}
          >
            <span className="font-semibold uppercase tracking-wider">{s.label}</span>
            <span className="text-[9px] text-zinc-500">{s.duration}</span>
          </button>
        );
      })}
    </div>
  );
}
