import { useMapStore } from "@/lib/store";

function formatTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `T+${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function TimeBar() {
  const playing = useMapStore((s) => s.playing);
  const speed = useMapStore((s) => s.speed);
  const scenarioTime = useMapStore((s) => s.scenarioTime);
  const setPlaying = useMapStore((s) => s.setPlaying);
  const setSpeed = useMapStore((s) => s.setSpeed);
  const setScenarioTime = useMapStore((s) => s.setScenarioTime);
  const reset = useMapStore((s) => s.reset);

  return (
    <div className="pointer-events-auto absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-zinc-700/70 bg-zinc-900/85 px-4 py-2 font-mono text-xs text-zinc-100 shadow-lg backdrop-blur">
      <button
        onClick={() => setPlaying(!playing)}
        className="rounded bg-cyan-500/20 px-3 py-1 text-cyan-200 hover:bg-cyan-500/30"
      >
        {playing ? "Pause" : "Play"}
      </button>
      <button
        onClick={() => {
          reset();
          setScenarioTime(0);
        }}
        className="rounded bg-zinc-700/40 px-2 py-1 text-zinc-300 hover:bg-zinc-700/60"
      >
        Reset
      </button>
      <div className="flex items-center gap-1">
        {[1, 10, 100].map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s as 1 | 10 | 100)}
            className={`rounded px-2 py-1 ${
              speed === s
                ? "bg-cyan-500/30 text-cyan-100"
                : "text-zinc-400 hover:bg-zinc-700/40"
            }`}
          >
            {s}×
          </button>
        ))}
      </div>
      <span className="tabular-nums text-zinc-300">{formatTime(scenarioTime)}</span>
    </div>
  );
}
