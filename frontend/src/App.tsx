import AlertFeed from "@/components/AlertFeed";
import ChatDrawer from "@/components/ChatDrawer";
import ChatLauncher from "@/components/ChatLauncher";
import DetailPanel from "@/components/DetailPanel";
import MapCanvas from "@/components/MapCanvas";
import TimeBar from "@/components/TimeBar";
import Watermark from "@/components/Watermark";
import { useTape } from "@/lib/useTape";
import { useTapePlayer } from "@/lib/tapePlayer";

export default function App() {
  const tape = useTape();
  useTapePlayer(tape);

  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-950 text-zinc-100">
      <MapCanvas />
      <Watermark />
      <AlertFeed />
      <DetailPanel />
      <TimeBar />
      <ChatLauncher />
      <ChatDrawer />
    </div>
  );
}
