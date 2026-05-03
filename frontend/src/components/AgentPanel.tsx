import { useEffect, useRef, useState } from "react";
import { useMapStore } from "@/lib/store";
import type { MemoryKind } from "@/lib/types";

type Step =
  | { kind: "idle" }
  | { kind: "thinking" }
  | { kind: "proposed"; userText: string; memoryKind: MemoryKind; proposalText: string };

function classify(text: string): MemoryKind {
  const t = text.toLowerCase();
  if (t.includes("always") || t.includes("never") || t.includes("rule") || t.includes("must"))
    return "rule";
  if (t.includes("usually") || t.includes("typically") || t.includes("tends") || t.includes("often"))
    return "prior";
  return "reasoning_example";
}

function craftProposal(text: string, kind: MemoryKind): string {
  switch (kind) {
    case "rule":
      return text.trim().endsWith(".") ? text.trim() : `${text.trim()}.`;
    case "prior":
      return `Prior: ${text.trim()}`;
    case "reasoning_example":
      return `Example: ${text.trim()}`;
  }
}

export default function AgentPanel() {
  const open = useMapStore((s) => s.chatOpen);
  const prefill = useMapStore((s) => s.chatPrefill);
  const openChat = useMapStore((s) => s.openChat);
  const closeChat = useMapStore((s) => s.closeChat);
  const addMemory = useMapStore((s) => s.addMemory);

  const [input, setInput] = useState("");
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open) {
      if (prefill) setInput(prefill);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, prefill]);

  const submit = () => {
    if (!input.trim()) return;
    const userText = input.trim();
    setStep({ kind: "thinking" });
    setTimeout(() => {
      const memoryKind = classify(userText);
      setStep({
        kind: "proposed",
        userText,
        memoryKind,
        proposalText: craftProposal(userText, memoryKind),
      });
    }, 700);
  };

  const confirm = () => {
    if (step.kind !== "proposed") return;
    addMemory({
      id: `mem-${Date.now()}`,
      t: Date.now() / 1000,
      kind: step.memoryKind,
      text: step.proposalText,
      source: "analyst",
    });
    setInput("");
    setStep({ kind: "idle" });
  };

  if (!open) {
    return (
      <button
        onClick={() => openChat()}
        title="Open agent"
        className="flex h-full w-12 flex-col items-center gap-3 border-l border-zinc-800 bg-zinc-900/95 py-4 text-zinc-400 transition-colors hover:bg-zinc-800/80 hover:text-zinc-100"
      >
        <span className="text-base leading-none">‹</span>
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.2em]"
          style={{ writingMode: "vertical-rl" }}
        >
          Agent
        </span>
        <span className="mt-auto inline-block h-2 w-2 rounded-full bg-emerald-400" />
      </button>
    );
  }

  return (
    <aside className="flex h-full w-96 flex-col border-l border-zinc-800 bg-zinc-900/95 backdrop-blur">
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
            Agent
          </span>
          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-300">
            stub
          </span>
        </div>
        <button
          onClick={closeChat}
          title="Collapse"
          className="rounded px-2 py-0.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          ›
        </button>
      </header>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        <div className="rounded border border-zinc-800 bg-zinc-950/60 p-3 text-xs leading-relaxed text-zinc-400">
          Ask a question about the AO, correct an inference, or capture a rule
          for the agent to remember. Confirmed entries are written to memory.
        </div>

        {step.kind === "proposed" && (
          <div className="rounded border border-fuchsia-500/40 bg-fuchsia-500/5 p-3">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-fuchsia-300">
              Proposed memory · {step.memoryKind.replace("_", " ")}
            </div>
            <div className="text-sm text-zinc-100">{step.proposalText}</div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={confirm}
                className="rounded bg-fuchsia-500/30 px-3 py-1 text-xs font-medium text-fuchsia-100 hover:bg-fuchsia-500/50"
              >
                Save to memory
              </button>
              <button
                onClick={() => setStep({ kind: "idle" })}
                className="rounded bg-zinc-700/40 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-700/70"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {step.kind === "thinking" && (
          <div className="rounded border border-zinc-700/70 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-400">
            <span className="animate-pulse">Agent is thinking…</span>
          </div>
        )}
      </div>

      <div className="border-t border-zinc-800 p-3">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Ask the agent or add a rule, prior, or example…"
          rows={3}
          className="w-full resize-none rounded border border-zinc-700/70 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-400/60 focus:outline-none"
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={submit}
            disabled={!input.trim() || step.kind === "thinking"}
            className="rounded bg-cyan-500/30 px-4 py-1.5 text-sm font-medium text-cyan-100 hover:bg-cyan-500/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </aside>
  );
}
