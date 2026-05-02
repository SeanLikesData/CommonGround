import { useState } from "react";
import { useMapStore } from "@/lib/store";

const SCENARIOS = [
  { id: "wadi_hamrin", label: "Wadi Hamrin", duration: "90 min" },
  { id: "patrol_hvs", label: "Patrol → HVS", duration: "14 days" },
] as const;

export default function DemoMenu() {
  const scenario = useMapStore((s) => s.scenario);
  const setScenario = useMapStore((s) => s.setScenario);
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-auto absolute right-3 top-3 z-30 flex w-52 flex-col rounded-lg border border-zinc-700/70 bg-zinc-900/85 shadow-lg backdrop-blur">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between border-b border-zinc-700/40 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-300 hover:bg-zinc-800/60"
      >
        <span className="flex items-center gap-2">
          <span className="text-amber-400">⚙</span>
          <span>Demo</span>
        </span>
        <span className="text-zinc-500">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-1 p-2">
          <div className="px-1 pb-1 text-[10px] uppercase tracking-wider text-zinc-500">
            Replay scenario
          </div>
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
                <span className="font-semibold uppercase tracking-wider">
                  {s.label}
                </span>
                <span className="text-[9px] text-zinc-500">{s.duration}</span>
              </button>
            );
          })}
          {scenario && (
            <button
              onClick={() => setScenario(null)}
              className="mt-1 rounded border border-zinc-700/60 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800/60"
            >
              Exit demo · return to live
            </button>
          )}
        </div>
      )}
    </div>
  );
}
