import { getMapInstance } from "@/lib/mapInstance";
import {
  MAP_BEARING,
  MAP_CENTER,
  MAP_PITCH,
  MAP_ZOOM,
} from "@/lib/mapStyle";
import { useMapStore, type SpotDisplayMode } from "@/lib/store";

const SPOT_MODES: {
  id: SpotDisplayMode;
  label: string;
  hint: string;
}[] = [
  {
    id: "merge",
    label: "Merge into sensor",
    hint: "Sensor itself lights up (severity ring + pulse). Cleanest at a glance.",
  },
  {
    id: "offset",
    label: "Lollipop offset",
    hint: "Sensor stays muted; spots fan out with leader lines. Good for tracking individual reports.",
  },
  {
    id: "cluster",
    label: "Cluster on collision",
    hint: "Sensor pulses with a count badge. Best when one sensor sees many things.",
  },
];

function Toggle({
  on,
  onChange,
  label,
  hint,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="flex w-full items-start gap-3 rounded px-2 py-2 text-left transition-colors hover:bg-zinc-800/50"
    >
      <span
        className={`mt-0.5 inline-flex h-4 w-7 flex-none items-center rounded-full border transition-colors ${
          on
            ? "border-cyan-400/60 bg-cyan-500/40"
            : "border-zinc-600 bg-zinc-800"
        }`}
      >
        <span
          className={`inline-block h-3 w-3 rounded-full bg-zinc-100 transition-transform ${
            on ? "translate-x-3.5" : "translate-x-0.5"
          }`}
        />
      </span>
      <span className="flex flex-col">
        <span className="text-xs text-zinc-100">{label}</span>
        {hint && <span className="text-[10px] text-zinc-500">{hint}</span>}
      </span>
    </button>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
      {children}
    </div>
  );
}

export default function SettingsPanel() {
  const autoFly = useMapStore((s) => s.autoFlyToAlerts);
  const setAutoFly = useMapStore((s) => s.setAutoFlyToAlerts);
  const showWatermark = useMapStore((s) => s.showWatermark);
  const setShowWatermark = useMapStore((s) => s.setShowWatermark);
  const spotMode = useMapStore((s) => s.spotDisplayMode);
  const setSpotMode = useMapStore((s) => s.setSpotDisplayMode);

  const resetView = () => {
    const map = getMapInstance();
    if (!map) return;
    map.flyTo({
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      pitch: MAP_PITCH,
      bearing: MAP_BEARING,
      speed: 0.9,
    });
  };

  return (
    <div className="flex flex-col p-2">
      <SectionHeader>SPOT display</SectionHeader>
      <div className="flex flex-col gap-1 px-1">
        {SPOT_MODES.map((m) => {
          const active = spotMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setSpotMode(m.id)}
              aria-pressed={active}
              className={`flex items-start gap-2 rounded border px-2 py-2 text-left transition-colors ${
                active
                  ? "border-cyan-400/50 bg-cyan-500/10"
                  : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-800/60"
              }`}
            >
              <span
                className={`mt-0.5 inline-flex h-3.5 w-3.5 flex-none items-center justify-center rounded-full border ${
                  active ? "border-cyan-300" : "border-zinc-600"
                }`}
              >
                {active && (
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-300" />
                )}
              </span>
              <span className="flex flex-col">
                <span className="text-xs text-zinc-100">{m.label}</span>
                <span className="text-[10px] leading-snug text-zinc-500">
                  {m.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <SectionHeader>Map behavior</SectionHeader>
      <Toggle
        on={autoFly}
        onChange={setAutoFly}
        label="Auto-fly to new alerts"
        hint="Recenter the map when a new fused alert arrives."
      />
      <button
        onClick={resetView}
        className="mt-1 rounded border border-zinc-700/70 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-200 transition-colors hover:border-cyan-400/40 hover:bg-zinc-800/70"
      >
        Reset view
      </button>

      <SectionHeader>Display</SectionHeader>
      <Toggle
        on={showWatermark}
        onChange={setShowWatermark}
        label="Show training watermark"
        hint="Synthetic-data badge in the top-left corner."
      />

      <SectionHeader>About</SectionHeader>
      <div className="px-2 py-1 text-[11px] leading-relaxed text-zinc-500">
        CommonGround demo · AO LIONHEART. Synthetic data, no live feeds.
      </div>
    </div>
  );
}
