import { useCallback, useEffect, useRef } from "react";
import AlertFeed from "@/components/AlertFeed";
import FiltersPanel from "@/components/FiltersPanel";
import GraphView from "@/components/GraphView";
import MemoryView from "@/components/MemoryView";
import SettingsPanel from "@/components/SettingsPanel";
import SpotFeed from "@/components/SpotFeed";
import {
  MIN_LEFT_PANEL_WIDTH,
  useMapStore,
  type LeftPanelId,
} from "@/lib/store";

const TITLES: Record<LeftPanelId, string> = {
  alerts: "Alerts",
  spots: "Spot reports",
  filters: "Filters & layers",
  graph: "Knowledge graph",
  memory: "Memory",
  settings: "Settings",
};

export default function LeftPanel() {
  const active = useMapStore((s) => s.leftPanel);
  const close = useMapStore((s) => s.closeLeftPanel);
  const width = useMapStore((s) => s.leftPanelWidth);
  const setWidth = useMapStore((s) => s.setLeftPanelWidth);
  const alertCount = useMapStore((s) => s.alerts.length);
  const spotCount = useMapStore((s) => s.events.length);
  const memoryCount = useMapStore((s) => s.memory.length);
  const filtersDirty = useMapStore(
    (s) => s.severityFilter.size !== 4 || s.sourceFilter.size !== 5,
  );

  const draggingRef = useRef(false);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!draggingRef.current) return;
      // 48 = NavRail width (w-12). Sidebar's left edge sits at x=48.
      const next = Math.min(e.clientX - 48, window.innerWidth - 200);
      setWidth(Math.max(MIN_LEFT_PANEL_WIDTH, next));
    },
    [setWidth],
  );

  const onPointerUp = useCallback(() => {
    draggingRef.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  if (!active) return null;

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const badge =
    active === "alerts"
      ? alertCount
      : active === "spots"
        ? spotCount
        : active === "memory"
          ? memoryCount
          : active === "filters" && filtersDirty
            ? "•"
            : null;

  return (
    <aside
      className="relative flex h-full flex-col border-r border-zinc-800 bg-zinc-900/95 backdrop-blur"
      style={{ width }}
    >
      <header className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
            {TITLES[active]}
          </span>
          {badge !== null && (
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
              {badge}
            </span>
          )}
        </div>
        <button
          onClick={close}
          title="Collapse"
          aria-label="Collapse panel"
          className="rounded px-2 py-0.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
        >
          ‹
        </button>
      </header>
      <div className="flex-1 overflow-auto">
        {active === "alerts" && <AlertFeed />}
        {active === "spots" && <SpotFeed />}
        {active === "filters" && <FiltersPanel />}
        {active === "graph" && <GraphView />}
        {active === "memory" && <MemoryView />}
        {active === "settings" && <SettingsPanel />}
      </div>
      <div
        onPointerDown={startDrag}
        title="Drag to resize"
        className="absolute right-0 top-0 z-10 h-full w-1.5 -translate-x-px cursor-col-resize bg-transparent transition-colors hover:bg-cyan-500/40"
      />
    </aside>
  );
}
