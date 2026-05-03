import AlertFeed from "@/components/AlertFeed";
import ChatDrawer from "@/components/ChatDrawer";
import ChatLauncher from "@/components/ChatLauncher";
import DetailPanel from "@/components/DetailPanel";
import GraphView from "@/components/GraphView";
import LayerToggle from "@/components/LayerToggle";
import MapCanvas from "@/components/MapCanvas";
import MemoryView from "@/components/MemoryView";
import ModeBadge from "@/components/ModeBadge";
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

  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-950 text-zinc-100">
      {view === "live" && (
        <>
          <MapCanvas />
          <Watermark />
          <ModeBadge />
          <AlertFeed />
          <div className="pointer-events-none absolute right-3 top-16 z-30 flex max-h-[calc(100vh-5rem)] flex-col items-end gap-2 overflow-y-auto pr-0.5">
            <LayerToggle />
            <SpotLegend />
            <DetailPanel />
          </div>
        </>
      )}
      {view === "graph" && <GraphView />}
      {view === "memory" && <MemoryView />}
      <TopTabs />
      <ChatLauncher />
      <ChatDrawer />
    </div>
  );
}
