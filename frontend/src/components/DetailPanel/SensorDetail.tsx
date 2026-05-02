import { useMapStore } from "@/lib/store";

export default function SensorDetail({ sensorId }: { sensorId: string }) {
  const events = useMapStore((s) => s.events);
  const observations = events.filter((e) => e.sensorId === sensorId);

  return (
    <div className="flex flex-col gap-3 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-100">
        Sensor · {sensorId}
      </h2>

      <div>
        <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">
          Recent observations ({observations.length})
        </div>
        {observations.length === 0 && (
          <div className="text-xs text-zinc-500">No observations on tape yet.</div>
        )}
        <div className="flex flex-col gap-1">
          {observations.map((s) => (
            <div
              key={s.id}
              className="rounded border border-zinc-800 bg-zinc-900/60 px-2 py-1.5 text-xs text-zinc-200"
            >
              <span className="mr-2 font-mono text-[10px] text-zinc-500">
                T+{Math.floor(s.t / 60)}:{Math.floor(s.t % 60).toString().padStart(2, "0")}
              </span>
              {s.salute.split(";")[0]}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
