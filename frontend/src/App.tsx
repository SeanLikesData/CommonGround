import AlertFeed from "@/components/AlertFeed";
import ChatDrawer from "@/components/ChatDrawer";
import ChatLauncher from "@/components/ChatLauncher";
import DemoMenu from "@/components/DemoMenu";
import DetailPanel from "@/components/DetailPanel";
import LayerToggle from "@/components/LayerToggle";
import MapCanvas from "@/components/MapCanvas";
import MemorySidebar from "@/components/MemorySidebar";
import ModeBadge from "@/components/ModeBadge";
import SpotLegend from "@/components/SpotLegend";
import TimeBar from "@/components/TimeBar";
import Watermark from "@/components/Watermark";
import { useMapStore } from "@/lib/store";
import { useFlyToOnAlert } from "@/lib/useFlyToOnAlert";
import { useTape } from "@/lib/useTape";
import { useTapePlayer } from "@/lib/tapePlayer";

export default function App() {
  const tape = useTape();
  useTapePlayer(tape);
  useFlyToOnAlert();
  const scenario = useMapStore((s) => s.scenario);

  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-950 text-zinc-100">
      <MapCanvas />
      <Watermark />
      <ModeBadge />
      <AlertFeed />
      <div className="pointer-events-none absolute right-3 top-3 z-30 flex max-h-[calc(100vh-1.5rem)] flex-col items-end gap-2 overflow-y-auto pr-0.5">
        <DemoMenu />
        <LayerToggle />
        <SpotLegend />
        <DetailPanel />
      </div>
      <MemorySidebar />
      {scenario && <TimeBar />}
      <ChatLauncher />
      <ChatDrawer />
    </div>
  );
}
