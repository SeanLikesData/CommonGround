import { useEffect, useState } from "react";
import Markdown from "@/components/Markdown";
import { generateSitrep, type SitrepResponse } from "@/lib/sitrep";

interface Props {
  open: boolean;
  onClose: () => void;
}

const WINDOWS: { label: string; minutes: number }[] = [
  { label: "15 min", minutes: 15 },
  { label: "1 hr", minutes: 60 },
  { label: "4 hr", minutes: 240 },
  { label: "24 hr", minutes: 1440 },
];

export default function SitrepModal({ open, onClose }: Props) {
  const [windowMinutes, setWindowMinutes] = useState(60);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<SitrepResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setResult(null);
      setError(null);
      setPending(false);
      setCopied(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const run = async () => {
    setPending(true);
    setError(null);
    setResult(null);
    try {
      setResult(await generateSitrep(windowMinutes));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
    }
  };

  const copy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.sitrep);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const download = () => {
    if (!result) return;
    const stamp = result.as_of.replace(/[:]/g, "-");
    const blob = new Blob([result.sitrep], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sitrep-${stamp}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              Generate SITREP
            </span>
            {result && (
              <span className="text-xs text-zinc-500">
                {result.report_count} reports · {result.alert_count} alerts ·
                last {result.window_minutes} min
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded px-2 py-0.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            title="Close"
          >
            ✕
          </button>
        </header>

        <div className="flex items-center gap-2 border-b border-zinc-800 px-5 py-3">
          <span className="text-xs text-zinc-400">Window:</span>
          {WINDOWS.map((w) => (
            <button
              key={w.minutes}
              onClick={() => setWindowMinutes(w.minutes)}
              disabled={pending}
              className={`rounded px-2.5 py-1 text-xs ${
                windowMinutes === w.minutes
                  ? "bg-cyan-500/30 text-cyan-100"
                  : "bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {w.label}
            </button>
          ))}
          <div className="ml-auto flex gap-2">
            {result && (
              <>
                <button
                  onClick={copy}
                  className="rounded bg-zinc-800 px-3 py-1 text-xs text-zinc-200 hover:bg-zinc-700"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={download}
                  className="rounded bg-zinc-800 px-3 py-1 text-xs text-zinc-200 hover:bg-zinc-700"
                >
                  Download .md
                </button>
              </>
            )}
            <button
              onClick={run}
              disabled={pending}
              className="rounded bg-cyan-500/30 px-3 py-1 text-xs font-medium text-cyan-100 hover:bg-cyan-500/50 disabled:opacity-40"
            >
              {pending ? "Generating…" : result ? "Regenerate" : "Generate"}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!result && !pending && !error && (
            <p className="text-sm text-zinc-400">
              Pick a reporting window and hit <em>Generate</em>. The agent will
              pull recent SPOT reports, alerts, and durable analyst memories,
              then produce a structured SITREP (BLUF, enemy / friendly /
              logistics, commander's assessment, recommendations).
            </p>
          )}
          {pending && (
            <p className="text-sm text-zinc-400 animate-pulse">
              Pulling data and writing SITREP…
            </p>
          )}
          {error && (
            <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}
          {result && (
            <div className="text-sm leading-relaxed text-zinc-100">
              <Markdown>{result.sitrep}</Markdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
