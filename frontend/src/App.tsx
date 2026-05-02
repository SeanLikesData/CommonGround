import AlertFeed from "@/components/AlertFeed";
import ChatDrawer from "@/components/ChatDrawer";
import ChatLauncher from "@/components/ChatLauncher";
import DetailPanel from "@/components/DetailPanel";
import LayerToggle from "@/components/LayerToggle";
import MapCanvas from "@/components/MapCanvas";
import MemorySidebar from "@/components/MemorySidebar";
import ScenarioPicker from "@/components/ScenarioPicker";
import TimeBar from "@/components/TimeBar";
import Watermark from "@/components/Watermark";
import { useFlyToOnAlert } from "@/lib/useFlyToOnAlert";
import { useTape } from "@/lib/useTape";
import { useTapePlayer } from "@/lib/tapePlayer";

export default function App() {
  const tape = useTape();
  useTapePlayer(tape);
  useFlyToOnAlert();

  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-950 text-zinc-100">
      <MapCanvas />
      <Watermark />
      <ScenarioPicker />
      <AlertFeed />
      <DetailPanel />
      <LayerToggle />
      <MemorySidebar />
      <TimeBar />
      <ChatLauncher />
      <ChatDrawer />
    </div>
  );
}
