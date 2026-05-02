import MapCanvas from "@/components/MapCanvas";
import Watermark from "@/components/Watermark";

export default function App() {
  return (
    <div className="relative h-full w-full bg-zinc-950 text-zinc-100">
      <MapCanvas />
      <Watermark />
    </div>
  );
}
