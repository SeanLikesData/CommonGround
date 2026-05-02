import { useMapStore } from "@/lib/store";
import type { MemoryKind } from "@/lib/types";

const KIND_COLOR: Record<MemoryKind, string> = {
  rule: "bg-fuchsia-500/20 text-fuchsia-200",
  prior: "bg-violet-500/20 text-violet-200",
  reasoning_example: "bg-indigo-500/20 text-indigo-200",
};

export default function MemorySidebar() {
  const memory = useMapStore((s) => s.memory);

  if (memory.length === 0) return null;

  return (
    <div className="pointer-events-auto absolute bottom-24 right-3 z-30 flex max-h-[35vh] w-72 flex-col overflow-hidden rounded-lg border border-zinc-700/70 bg-zinc-900/85 shadow-lg backdrop-blur">
      <div className="flex items-center justify-between border-b border-zinc-700/70 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-300">
        <span>Memory</span>
        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
          {memory.length}
        </span>
      </div>
      <div className="flex flex-col gap-1 overflow-y-auto p-2">
        {memory.map((m) => (
          <div
            key={m.id}
            className="rounded border border-zinc-800 bg-zinc-950/40 p-2 text-xs leading-snug"
          >
            <div className="mb-1 flex items-center gap-1.5">
              <span
                className={`rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${KIND_COLOR[m.kind]}`}
              >
                {m.kind.replace("_", " ")}
              </span>
              <span className="text-[9px] text-zinc-500">
                {m.source === "analyst" ? "analyst" : "seed"}
              </span>
            </div>
            <div className="text-zinc-200">{m.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
