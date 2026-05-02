import { useMapStore } from "@/lib/store";

const SCENARIO_LABELS: Record<string, string> = {
  wadi_hamrin: "Wadi Hamrin",
  patrol_hvs: "Patrol → HVS",
};

export default function ModeBadge() {
  const scenario = useMapStore((s) => s.scenario);
  const eventCount = useMapStore((s) => s.events.length);
  const alertCount = useMapStore((s) => s.alerts.length);

  const live = scenario === null;

  return (
    <div className="pointer-events-none absolute left-3 top-12 z-30 flex items-center gap-2 rounded-lg border border-zinc-700/70 bg-zinc-900/85 px-3 py-1.5 shadow-lg backdrop-blur">
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          live ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
        }`}
      />
      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-200">
        {live ? "Live" : `Replay · ${SCENARIO_LABELS[scenario] ?? scenario}`}
      </span>
      <span className="text-[10px] text-zinc-500">
        {eventCount} spot{eventCount === 1 ? "" : "s"} · {alertCount} alert
        {alertCount === 1 ? "" : "s"}
      </span>
    </div>
  );
}
