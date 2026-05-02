import { REPORTERS } from "@/lib/reporters";

export default function SpotLegend() {
  return (
    <div className="pointer-events-auto flex w-44 flex-col rounded-lg border border-zinc-700/70 bg-zinc-900/85 shadow-lg backdrop-blur">
      <div className="border-b border-zinc-700/40 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-300">
        Reporter
      </div>
      <div className="flex flex-col gap-0.5 p-1">
        {REPORTERS.map((r) => (
          <div
            key={r.source}
            className="flex items-center gap-2 rounded px-2 py-0.5 text-xs text-zinc-300"
          >
            <span className="inline-block w-4 text-center text-base leading-none text-zinc-100">
              {r.glyph}
            </span>
            <span>{r.label}</span>
          </div>
        ))}
        <div className="mt-1 border-t border-zinc-700/40 pt-1">
          <div className="px-2 pb-0.5 text-[10px] uppercase tracking-wider text-zinc-500">
            Recency
          </div>
          <div className="flex items-center gap-2 px-2 py-0.5 text-[10px] text-zinc-400">
            <span className="text-base leading-none text-rose-400">●</span>
            <span>Fresh</span>
            <span className="ml-auto text-base leading-none text-zinc-500">●</span>
            <span>Stale</span>
          </div>
        </div>
      </div>
    </div>
  );
}
