import { useMapStore } from "@/lib/store";
import AlertDetail from "./AlertDetail";
import InferredSiteDetail from "./InferredSiteDetail";
import SensorDetail from "./SensorDetail";
import SpotDetail from "./SpotDetail";

export default function DetailPanel() {
  const selection = useMapStore((s) => s.selection);
  const events = useMapStore((s) => s.events);
  const alerts = useMapStore((s) => s.alerts);
  const setSelection = useMapStore((s) => s.setSelection);

  if (!selection) return null;

  let body: React.ReactNode = null;
  if (selection.kind === "spot") {
    const s = events.find((e) => e.id === selection.id);
    if (s) body = <SpotDetail spot={s} />;
  } else if (selection.kind === "alert") {
    const a = alerts.find((x) => x.id === selection.id);
    if (a) body = <AlertDetail alert={a} />;
  } else if (selection.kind === "sensor") {
    body = <SensorDetail sensorId={selection.id} />;
  } else if (selection.kind === "inferred") {
    body = <InferredSiteDetail id={selection.id} />;
  }

  return (
    <div className="pointer-events-auto absolute right-3 top-3 z-30 flex max-h-[calc(100vh-6rem)] w-[26rem] flex-col overflow-hidden rounded-lg border border-zinc-700/70 bg-zinc-900/85 shadow-lg backdrop-blur">
      <div className="flex items-center justify-between border-b border-zinc-700/70 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
          Detail
        </span>
        <button
          onClick={() => setSelection(null)}
          className="rounded px-2 py-0.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          ✕
        </button>
      </div>
      <div className="overflow-y-auto">{body}</div>
    </div>
  );
}
