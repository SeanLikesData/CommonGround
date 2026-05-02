import AlertFeed from "@/components/AlertFeed";
import ChatDrawer from "@/components/ChatDrawer";
import ChatLauncher from "@/components/ChatLauncher";
import DemoMenu from "@/components/DemoMenu";
import DetailPanel from "@/components/DetailPanel";
import LayerToggle from "@/components/LayerToggle";
import MapCanvas from "@/components/MapCanvas";
import MemorySidebar from "@/components/MemorySidebar";
import ModeBadge from "@/components/ModeBadge";
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
      <DemoMenu />
      <AlertFeed />
      <DetailPanel />
      <LayerToggle />
      <MemorySidebar />
      {scenario && <TimeBar />}
      <ChatLauncher />
      <ChatDrawer />
    </div>
  );
}
