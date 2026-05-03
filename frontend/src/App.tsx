import { useMemo } from "react";
import AgentPanel from "@/components/AgentPanel";
import DetailPanel from "@/components/DetailPanel";
import LeftPanel from "@/components/LeftPanel";
import MapCanvas from "@/components/MapCanvas";
import NavRail from "@/components/NavRail";
import SpotLegend from "@/components/SpotLegend";
import TimeScrubber from "@/components/TimeScrubber";
import { useMapStore } from "@/lib/store";
import { useFlyToOnAlert } from "@/lib/useFlyToOnAlert";
import { useLiveSeed } from "@/lib/useLiveSeed";
import { usePlayback } from "@/lib/usePlayback";

export default function App() {
  useLiveSeed();
  useFlyToOnAlert();

  const events = useMapStore((s) => s.events);
  const alerts = useMapStore((s) => s.alerts);
  const bounds = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const e of events) {
      if (e.t < min) min = e.t;
      if (e.t > max) max = e.t;
    }
    for (const a of alerts) {
      if (a.t < min) min = a.t;
      if (a.t > max) max = a.t;
    }
    return Number.isFinite(min) && Number.isFinite(max)
      ? { min, max }
      : null;
  }, [events, alerts]);

  usePlayback(bounds);

  return (
    <div className="flex h-full w-full overflow-hidden bg-zinc-950 text-zinc-100">
      <NavRail />
      <LeftPanel />
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <div className="relative flex-1 overflow-hidden">
          <MapCanvas />
          <div className="pointer-events-none absolute right-3 top-3 z-30 flex max-h-[calc(100%-1.5rem)] flex-col items-end gap-2 overflow-y-auto pr-0.5">
            <SpotLegend />
            <DetailPanel />
          </div>
        </div>
        <TimeScrubber bounds={bounds} />
      </div>
      <AgentPanel />
    </div>
  );
}
