import { severityColor } from "@/lib/symbology";
import type { SpotEvent } from "@/lib/types";

export default function SpotDetail({ spot }: { spot: SpotEvent }) {
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ backgroundColor: severityColor(spot.severity) }}
        />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-100">
          SPOT — {spot.source.toUpperCase()}
          {spot.sensorId ? ` · ${spot.sensorId}` : ""}
        </h2>
      </div>

      <div className="rounded border border-zinc-700/70 bg-zinc-950/60 p-3">
        <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">
          SALUTE
        </div>
        <pre className="whitespace-pre-wrap font-mono text-xs leading-snug text-zinc-200">
          {spot.salute}
        </pre>
      </div>

      {spot.quote && (
        <div className="rounded border-l-2 border-cyan-400/60 bg-zinc-900/60 px-3 py-2">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">
            Source quote
          </div>
          <div className="text-sm italic leading-snug text-zinc-300">
            “{spot.quote}”
          </div>
        </div>
      )}

      <div className="text-[10px] text-zinc-500">
        Symbol set: simplified for demo; production uses MIL-STD-2525D.
      </div>
    </div>
  );
}
