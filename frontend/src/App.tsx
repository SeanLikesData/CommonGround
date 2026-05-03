import AgentPanel from "@/components/AgentPanel";
import DetailPanel from "@/components/DetailPanel";
import LeftPanel from "@/components/LeftPanel";
import MapCanvas from "@/components/MapCanvas";
import ModeBadge from "@/components/ModeBadge";
import NavRail from "@/components/NavRail";
import SpotLegend from "@/components/SpotLegend";
import Watermark from "@/components/Watermark";
import { useMapStore } from "@/lib/store";
import { useFlyToOnAlert } from "@/lib/useFlyToOnAlert";
import { useLiveSeed } from "@/lib/useLiveSeed";

export default function App() {
  useLiveSeed();
  useFlyToOnAlert();
  const showWatermark = useMapStore((s) => s.showWatermark);

  return (
    <div className="flex h-full w-full overflow-hidden bg-zinc-950 text-zinc-100">
      <NavRail />
      <LeftPanel />
      <div className="relative flex-1 overflow-hidden">
        <MapCanvas />
        {showWatermark && <Watermark />}
        <ModeBadge />
        <div className="pointer-events-none absolute right-3 top-3 z-30 flex max-h-[calc(100vh-1.5rem)] flex-col items-end gap-2 overflow-y-auto pr-0.5">
          <SpotLegend />
          <DetailPanel />
        </div>
      </div>
      <AgentPanel />
    </div>
  );
}
