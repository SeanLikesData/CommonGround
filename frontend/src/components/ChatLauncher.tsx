import { useMapStore } from "@/lib/store";

export default function ChatLauncher() {
  const open = useMapStore((s) => s.chatOpen);
  const openChat = useMapStore((s) => s.openChat);
  if (open) return null;
  return (
    <button
      onClick={() => openChat()}
      className="pointer-events-auto absolute bottom-4 right-4 z-30 flex items-center gap-2 rounded-full border border-cyan-400/40 bg-zinc-900/90 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-cyan-200 shadow-lg backdrop-blur hover:bg-zinc-800/90"
    >
      <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
      Ask the agent
    </button>
  );
}
