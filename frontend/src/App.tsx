import Watermark from "@/components/Watermark";

export default function App() {
  return (
    <div className="relative h-full w-full bg-zinc-950 text-zinc-100">
      <Watermark />
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Map mounts here in Phase 1.
      </div>
    </div>
  );
}
