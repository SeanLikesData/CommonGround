import { useMapStore } from "@/lib/store";
import { reporterFromSensorId, reporterMeta } from "@/lib/reporters";
import { severityColor } from "@/lib/symbology";
import { formatDTG } from "@/lib/time";
import type { SpotEvent } from "@/lib/types";

function SpotRow({ spot, onClick }: { spot: SpotEvent; onClick: () => void }) {
  const meta = reporterMeta(spot.source);
  const sevColor = severityColor(spot.severity);
  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-1 rounded border border-zinc-800 bg-zinc-900/60 px-2.5 py-2 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-800/70"
    >
      <div className="flex items-center gap-2">
        <span
          className="text-base leading-none"
          style={{ color: sevColor }}
        >
          {meta.glyph}
        </span>
        <span className="font-mono text-[10px] text-zinc-500">
          {formatDTG(spot.t)}
        </span>
        <span
          className="ml-auto rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
          style={{ color: sevColor, borderColor: sevColor, borderWidth: 1 }}
        >
          {spot.severity}
        </span>
      </div>
      <div className="text-xs leading-snug text-zinc-200">
        {spot.salute}
      </div>
      {spot.quote && (
        <div className="border-l-2 border-cyan-400/40 pl-2 text-[11px] italic leading-snug text-zinc-400">
          “{spot.quote}”
        </div>
      )}
    </button>
  );
}

export default function SensorDetail({ sensorId }: { sensorId: string }) {
  const events = useMapStore((s) => s.events);
  const setSelection = useMapStore((s) => s.setSelection);

  const observations = events
    .filter((e) => e.sensorId === sensorId)
    .sort((a, b) => b.t - a.t);

  const inferredSource = observations[0]?.source ?? reporterFromSensorId(sensorId);
  const meta = reporterMeta(inferredSource);
  const active = observations.length > 0;

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <span className="text-lg leading-none text-zinc-100">{meta.glyph}</span>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-100">
          {meta.label} · {sensorId}
        </h2>
        <span
          className={`ml-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
            active
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-zinc-800 text-zinc-500"
          }`}
        >
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              active ? "bg-emerald-400" : "bg-zinc-600"
            }`}
          />
          {active ? "Active" : "Idle"}
        </span>
      </div>

      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-500">
        <span>SPOT reports ({observations.length})</span>
        {observations.length > 0 && <span>Newest first</span>}
      </div>

      {observations.length === 0 ? (
        <div className="rounded border border-dashed border-zinc-800 px-3 py-4 text-center text-xs text-zinc-500">
          No detections yet. SPOT reports will appear here when the sensor fires.
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {observations.map((s) => (
            <SpotRow
              key={s.id}
              spot={s}
              onClick={() => setSelection({ kind: "spot", id: s.id })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
