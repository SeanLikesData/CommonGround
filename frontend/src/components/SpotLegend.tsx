import { severityColor, type Severity } from "@/lib/symbology";
import { layerColors } from "@/lib/mapStyle";

const SEVERITIES: { key: Severity; label: string }[] = [
  { key: "low", label: "Low" },
  { key: "med", label: "Med" },
  { key: "med-high", label: "Med-Hi" },
  { key: "high", label: "High" },
];

function Row({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 px-2 py-0.5 text-xs text-zinc-300">
      <span className="flex h-5 w-5 items-center justify-center">{swatch}</span>
      <span>{label}</span>
    </div>
  );
}

export default function SpotLegend() {
  return (
    <div className="pointer-events-auto flex w-44 flex-col rounded-lg border border-zinc-700/70 bg-zinc-900/85 shadow-lg backdrop-blur">
      <div className="border-b border-zinc-700/40 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-300">
        Signals
      </div>
      <div className="flex flex-col gap-0.5 p-1">
        <Row
          swatch={
            <span
              className="inline-block h-2.5 w-2.5 rounded-full border-2"
              style={{ borderColor: layerColors.sensor, background: "#0f172a" }}
            />
          }
          label="Sensor (idle)"
        />
        <Row
          swatch={
            <span
              className="inline-block h-3 w-3 rounded-full border-[2.5px]"
              style={{
                borderColor: severityColor("med-high"),
                background: "#0f172a",
                boxShadow: `0 0 6px ${severityColor("med-high")}`,
              }}
            />
          }
          label="Sensor reporting"
        />
        <Row
          swatch={
            <span className="relative flex h-4 w-4 items-center justify-center">
              <span
                className="absolute inset-0 rounded-full"
                style={{
                  background: severityColor("high"),
                  opacity: 0.65,
                }}
              />
              <span className="relative text-[10px] leading-none text-zinc-100">
                ●
              </span>
            </span>
          }
          label="Ad-hoc SPOT"
        />
        <Row
          swatch={
            <span
              className="inline-block h-3.5 w-3.5 rounded-full border-2"
              style={{
                borderColor: severityColor("high"),
                boxShadow: `0 0 4px ${severityColor("high")}`,
              }}
            />
          }
          label="Alert (fused)"
        />
        <div className="mt-1 border-t border-zinc-700/40 pt-1">
          <div className="px-2 pb-1 text-[10px] uppercase tracking-wider text-zinc-500">
            Severity
          </div>
          <div className="flex items-center gap-1 px-2 pb-1">
            {SEVERITIES.map((s) => (
              <div
                key={s.key}
                className="flex flex-1 flex-col items-center gap-0.5"
              >
                <span
                  className="h-2 w-full rounded-sm"
                  style={{ background: severityColor(s.key) }}
                />
                <span className="text-[9px] uppercase tracking-wider text-zinc-500">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

