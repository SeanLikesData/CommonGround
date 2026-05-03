import AgentPanel from "@/components/AgentPanel";
import DetailPanel from "@/components/DetailPanel";
import GraphView from "@/components/GraphView";
import LeftPanel from "@/components/LeftPanel";
import MapCanvas from "@/components/MapCanvas";
import MemoryView from "@/components/MemoryView";
import ModeBadge from "@/components/ModeBadge";
import NavRail from "@/components/NavRail";
import SpotLegend from "@/components/SpotLegend";
import TopTabs from "@/components/TopTabs";
import Watermark from "@/components/Watermark";
import { useMapStore } from "@/lib/store";
import { useFlyToOnAlert } from "@/lib/useFlyToOnAlert";
import { useLiveSeed } from "@/lib/useLiveSeed";

export default function App() {
  useLiveSeed();
  useFlyToOnAlert();
  const view = useMapStore((s) => s.view);
  const showWatermark = useMapStore((s) => s.showWatermark);

  return (
    <div className="flex h-full w-full overflow-hidden bg-zinc-950 text-zinc-100">
      <NavRail />
      <LeftPanel />
      <div className="relative flex-1 overflow-hidden">
        {view === "live" && (
          <>
            <MapCanvas />
            {showWatermark && <Watermark />}
            <ModeBadge />
            <div className="pointer-events-none absolute right-3 top-16 z-30 flex max-h-[calc(100vh-5rem)] flex-col items-end gap-2 overflow-y-auto pr-0.5">
              <SpotLegend />
              <DetailPanel />
            </div>
          </>
        )}
        {view === "graph" && <GraphView />}
        {view === "memory" && <MemoryView />}
        <TopTabs />
      </div>
      <AgentPanel />
    </div>
  );
}
