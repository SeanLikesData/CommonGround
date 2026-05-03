import { useMapStore } from "@/lib/store";
import type { MemoryKind } from "@/lib/types";

const KIND_COLOR: Record<MemoryKind, string> = {
  rule: "bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-500/40",
  prior: "bg-violet-500/20 text-violet-200 border-violet-500/40",
  reasoning_example: "bg-indigo-500/20 text-indigo-200 border-indigo-500/40",
};

const KIND_LABEL: Record<MemoryKind, string> = {
  rule: "Rule",
  prior: "Prior",
  reasoning_example: "Reasoning example",
};

export default function MemoryView() {
  const memory = useMapStore((s) => s.memory);

  const byKind: Record<MemoryKind, typeof memory> = {
    rule: [],
    prior: [],
    reasoning_example: [],
  };
  for (const m of memory) byKind[m.kind].push(m);

  return (
    <div className="px-4 pb-6 pt-3 text-zinc-100">
      <div className="flex flex-col gap-4">
        <p className="text-xs text-zinc-400">
          Rules, priors, and reasoning examples available to the analyst agent.
          These ground every alert produced on the live map.
        </p>

        {memory.length === 0 ? (
          <div className="rounded border border-dashed border-zinc-800 px-6 py-12 text-center text-sm text-zinc-500">
            No memory entries loaded.
          </div>
        ) : (
          (Object.keys(byKind) as MemoryKind[]).map((kind) => {
            const entries = byKind[kind];
            if (entries.length === 0) return null;
            return (
              <section key={kind} className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-500">
                  <span>{KIND_LABEL[kind]}</span>
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
                    {entries.length}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {entries.map((m) => (
                    <div
                      key={m.id}
                      className="rounded border border-zinc-800 bg-zinc-900/60 p-3"
                    >
                      <div className="mb-1.5 flex items-center gap-2">
                        <span
                          className={`rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${KIND_COLOR[m.kind]}`}
                        >
                          {KIND_LABEL[m.kind]}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                          {m.source}
                        </span>
                      </div>
                      <div className="text-sm leading-snug text-zinc-200">
                        {m.text}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
