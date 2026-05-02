import { useMapStore } from "@/lib/store";
import { severityColor } from "@/lib/symbology";
import type { AlertEvent } from "@/lib/types";

export default function AlertDetail({ alert }: { alert: AlertEvent }) {
  const events = useMapStore((s) => s.events);
  const memory = useMapStore((s) => s.memory);
  const setSelection = useMapStore((s) => s.setSelection);

  const contributing = events.filter((e) => alert.contributingSpotIds.includes(e.id));
  const cited = memory.filter((m) => alert.citedMemoryIds.includes(m.id));

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ backgroundColor: severityColor(alert.severity) }}
        />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-100">
          Alert · {alert.severity}
        </h2>
      </div>

      <div className="text-base leading-snug text-zinc-100">{alert.summary}</div>

      {alert.reasoning && (
        <div className="rounded border border-zinc-700/70 bg-zinc-950/60 p-3">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">
            Agent reasoning
          </div>
          <p className="text-xs leading-relaxed text-zinc-200">{alert.reasoning}</p>
        </div>
      )}

      <div>
        <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">
          Contributing reports
        </div>
        <div className="flex flex-col gap-1">
          {contributing.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelection({ kind: "spot", id: s.id })}
              className="flex items-center gap-2 rounded border border-zinc-800 bg-zinc-900/60 px-2 py-1.5 text-left text-xs hover:bg-zinc-800/80"
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: severityColor(s.severity) }}
              />
              <span className="font-mono text-[10px] text-zinc-500">
                {s.source.toUpperCase()}
                {s.sensorId ? `·${s.sensorId}` : ""}
              </span>
              <span className="truncate text-zinc-200">{s.salute.split(";")[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {cited.length > 0 && (
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">
            Cited memory ({cited.length})
          </div>
          <div className="flex flex-col gap-1">
            {cited.map((m) => (
              <div
                key={m.id}
                className="rounded border border-fuchsia-500/30 bg-fuchsia-500/5 px-2 py-1.5 text-xs"
              >
                <span className="mr-2 inline-block rounded bg-fuchsia-500/20 px-1 py-0.5 font-mono text-[9px] uppercase tracking-wider text-fuchsia-200">
                  {m.kind.replace("_", " ")}
                </span>
                <span className="text-zinc-200">{m.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
