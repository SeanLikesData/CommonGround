import { useMapStore, type View } from "@/lib/store";

const TABS: { id: View; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "graph", label: "Graph" },
  { id: "memory", label: "Memory" },
];

export default function TopTabs() {
  const view = useMapStore((s) => s.view);
  const setView = useMapStore((s) => s.setView);

  return (
    <div className="pointer-events-auto absolute left-1/2 top-3 z-40 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-zinc-700/70 bg-zinc-900/85 p-1 shadow-lg backdrop-blur">
      {TABS.map((t) => {
        const active = view === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            className={`rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              active
                ? "bg-cyan-500/25 text-cyan-100"
                : "text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
