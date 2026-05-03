import { useEffect, useRef, useState } from "react";
import Markdown from "@/components/Markdown";
import { useMapStore } from "@/lib/store";

const AGENT_URL = import.meta.env.VITE_AGENT_URL ?? "http://localhost:8001";

type Turn = {
  id: string;
  question: string;
  answer: string | null;
  error: string | null;
};

export default function AgentPanel() {
  const open = useMapStore((s) => s.chatOpen);
  const prefill = useMapStore((s) => s.chatPrefill);
  const openChat = useMapStore((s) => s.openChat);
  const closeChat = useMapStore((s) => s.closeChat);
  const openSitrep = useMapStore((s) => s.openSitrep);
  const addMemory = useMapStore((s) => s.addMemory);

  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      if (prefill) setInput(prefill);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, prefill]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [turns, pending]);

  const submit = async () => {
    if (!input.trim() || pending) return;
    const question = input.trim();
    const id = `t-${Date.now()}`;
    setTurns((prev) => [...prev, { id, question, answer: null, error: null }]);
    setInput("");
    setPending(true);
    try {
      const res = await fetch(`${AGENT_URL}/ask`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        answer: string;
        saved_memories?: string[];
      };
      setTurns((prev) =>
        prev.map((t) => (t.id === id ? { ...t, answer: data.answer } : t)),
      );
      for (const text of data.saved_memories ?? []) {
        addMemory({
          id: crypto.randomUUID(),
          t: 0,
          kind: "rule",
          source: "analyst",
          text,
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setTurns((prev) =>
        prev.map((t) => (t.id === id ? { ...t, error: msg } : t)),
      );
    } finally {
      setPending(false);
    }
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
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={openSitrep}
            title="Generate SITREP"
            className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-200 hover:bg-cyan-500/25"
          >
            SITREP
          </button>
          <button
            onClick={closeChat}
            title="Collapse"
            className="rounded px-2 py-0.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            ›
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {turns.length === 0 && (
          <div className="rounded border border-zinc-800 bg-zinc-950/60 p-3 text-xs leading-relaxed text-zinc-400">
            Ask about the AO, current activity, or specific entities. The agent
            queries the knowledge graph and live signal/report feeds, and may
            persist durable guidance to its memory.
          </div>
        )}

        {turns.map((turn) => (
          <div key={turn.id} className="flex flex-col gap-2">
            <div className="self-end max-w-[90%] rounded bg-cyan-500/15 px-3 py-2 text-sm text-cyan-50">
              {turn.question}
            </div>
            {turn.answer && (
              <div className="rounded border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm leading-relaxed text-zinc-100">
                <Markdown>{turn.answer}</Markdown>
              </div>
            )}
            {turn.error && (
              <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                Error: {turn.error}
              </div>
            )}
            {!turn.answer && !turn.error && (
              <div className="rounded border border-zinc-700/70 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-400">
                <span className="animate-pulse">Agent is thinking…</span>
              </div>
            )}
          </div>
        ))}
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
          placeholder="Ask the agent about current activity, regions, sensors…"
          rows={3}
          className="w-full resize-none rounded border border-zinc-700/70 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-400/60 focus:outline-none"
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={submit}
            disabled={!input.trim() || pending}
            className="rounded bg-cyan-500/30 px-4 py-1.5 text-sm font-medium text-cyan-100 hover:bg-cyan-500/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </aside>
  );
}
