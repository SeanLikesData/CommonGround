import AlertFeed from "@/components/AlertFeed";
import LayerToggle from "@/components/LayerToggle";
import SettingsPanel from "@/components/SettingsPanel";
import { useMapStore, type LeftPanelId } from "@/lib/store";

const TITLES: Record<LeftPanelId, string> = {
  alerts: "Alerts",
  layers: "Layers",
  settings: "Settings",
};

export default function LeftPanel() {
  const active = useMapStore((s) => s.leftPanel);
  const close = useMapStore((s) => s.closeLeftPanel);
  const alertCount = useMapStore((s) => s.alerts.length);

  if (!active) return null;

  return (
    <aside className="flex h-full w-80 flex-col border-r border-zinc-800 bg-zinc-900/95 backdrop-blur">
      <header className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
            {TITLES[active]}
          </span>
          {active === "alerts" && (
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
              {alertCount}
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
      <div className="flex-1 overflow-y-auto">
        {active === "alerts" && <AlertFeed />}
        {active === "layers" && <LayerToggle />}
        {active === "settings" && <SettingsPanel />}
      </div>
    </aside>
  );
}
