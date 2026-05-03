import { reporterMeta } from "@/lib/reporters";
import { severityColor } from "@/lib/symbology";
import { formatDTG } from "@/lib/time";
import type { SpotEvent } from "@/lib/types";
import SaluteFields from "../SaluteFields";

export default function SpotDetail({ spot }: { spot: SpotEvent }) {
  const meta = reporterMeta(spot.source);
  const sevColor = severityColor(spot.severity);
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ backgroundColor: sevColor }}
        />
        <span className="text-base leading-none" style={{ color: sevColor }}>
          {meta.glyph}
        </span>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-100">
          SPOT — {meta.label}
          {spot.sensorId ? ` · ${spot.sensorId}` : ""}
        </h2>
        <span
          className="ml-auto rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
          style={{ color: sevColor, borderColor: sevColor, borderWidth: 1 }}
        >
          {spot.severity}
        </span>
      </div>

      <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
        {formatDTG(spot.t)}
      </div>

      <div className="rounded border border-zinc-700/70 bg-zinc-950/60 p-3">
        <div className="mb-2 text-[10px] uppercase tracking-wider text-zinc-500">
          SALUTE
        </div>
        <SaluteFields salute={spot.salute} size="md" />
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
