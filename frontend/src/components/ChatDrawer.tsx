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

export default function ChatDrawer() {
  const open = useMapStore((s) => s.chatOpen);
  const prefill = useMapStore((s) => s.chatPrefill);
  const closeChat = useMapStore((s) => s.closeChat);
  const addMemory = useMapStore((s) => s.addMemory);
  const scenarioTime = useMapStore((s) => s.scenarioTime);

  const [input, setInput] = useState("");
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open) {
      setInput(prefill);
      setStep({ kind: "idle" });
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, prefill]);

  if (!open) return null;

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
      t: scenarioTime,
      kind: step.memoryKind,
      text: step.proposalText,
      source: "analyst",
    });
    setInput("");
    setStep({ kind: "idle" });
    closeChat();
  };

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-50 border-t border-zinc-700/70 bg-zinc-900/95 shadow-2xl backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            Analyst chat — live
            <span className="ml-1 rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-300">
              stub
            </span>
          </div>
          <button
            onClick={closeChat}
            className="rounded px-2 py-0.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            ✕
          </button>
        </div>

        {step.kind === "proposed" && (
          <div className="rounded border border-fuchsia-500/40 bg-fuchsia-500/5 p-3">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-fuchsia-300">
              Proposed memory entry · {step.memoryKind.replace("_", " ")}
            </div>
            <div className="text-sm text-zinc-100">{step.proposalText}</div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={confirm}
                className="rounded bg-fuchsia-500/30 px-3 py-1 text-xs font-medium text-fuchsia-100 hover:bg-fuchsia-500/50"
              >
                Confirm — write to memory
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

        <div className="flex items-end gap-2">
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
            placeholder="Correct the agent or add a rule, prior, or reasoning example…"
            rows={2}
            className="flex-1 resize-none rounded border border-zinc-700/70 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-400/60 focus:outline-none"
          />
          <button
            onClick={submit}
            disabled={!input.trim() || step.kind === "thinking"}
            className="rounded bg-cyan-500/30 px-4 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-500/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
