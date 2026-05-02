import { useMemo } from "react";
import { useMapStore } from "@/lib/store";
import { reporterMeta } from "@/lib/reporters";
import { severityColor } from "@/lib/symbology";

interface Node {
  id: string;
  kind: "memory" | "alert" | "spot" | "sensor";
  label: string;
  sub?: string;
  color: string;
  glyph?: string;
  x: number;
  y: number;
}

interface Edge {
  from: string;
  to: string;
  kind: "cites" | "contributes";
}

const COL = {
  memory: 140,
  alert: 540,
  spot: 940,
  sensor: 1240,
};

const ROW_HEIGHT = 70;
const TOP_PADDING = 80;

export default function GraphView() {
  const events = useMapStore((s) => s.events);
  const alerts = useMapStore((s) => s.alerts);
  const memory = useMapStore((s) => s.memory);
  const setSelection = useMapStore((s) => s.setSelection);

  const { nodes, edges, height } = useMemo(() => {
    const n: Node[] = [];
    const e: Edge[] = [];

    memory.forEach((m, i) => {
      n.push({
        id: `mem:${m.id}`,
        kind: "memory",
        label: m.kind.replace("_", " "),
        sub: m.text.slice(0, 60) + (m.text.length > 60 ? "…" : ""),
        color: "#c084fc",
        x: COL.memory,
        y: TOP_PADDING + i * ROW_HEIGHT,
      });
    });

    alerts.forEach((a, i) => {
      n.push({
        id: `alert:${a.id}`,
        kind: "alert",
        label: a.id,
        sub: a.summary.slice(0, 60) + (a.summary.length > 60 ? "…" : ""),
        color: severityColor(a.severity),
        x: COL.alert,
        y: TOP_PADDING + i * ROW_HEIGHT * 1.5,
      });
      for (const sid of a.contributingSpotIds) {
        e.push({ from: `alert:${a.id}`, to: `spot:${sid}`, kind: "contributes" });
      }
      for (const mid of a.citedMemoryIds) {
        e.push({ from: `alert:${a.id}`, to: `mem:${mid}`, kind: "cites" });
      }
    });

    const sensorIds = new Set<string>();
    events.forEach((s, i) => {
      const meta = reporterMeta(s.source);
      n.push({
        id: `spot:${s.id}`,
        kind: "spot",
        label: s.id,
        sub: meta.label + (s.sensorId ? ` · ${s.sensorId}` : ""),
        color: severityColor(s.severity),
        glyph: meta.glyph,
        x: COL.spot,
        y: TOP_PADDING + i * ROW_HEIGHT,
      });
      if (s.sensorId) {
        sensorIds.add(s.sensorId);
        e.push({ from: `spot:${s.id}`, to: `sensor:${s.sensorId}`, kind: "contributes" });
      }
    });

    [...sensorIds].forEach((sid, i) => {
      n.push({
        id: `sensor:${sid}`,
        kind: "sensor",
        label: sid,
        color: "#f8fafc",
        x: COL.sensor,
        y: TOP_PADDING + i * ROW_HEIGHT,
      });
    });

    const maxRow = Math.max(memory.length, alerts.length * 1.5, events.length, sensorIds.size);
    const h = TOP_PADDING + maxRow * ROW_HEIGHT + 80;
    return { nodes: n, edges: e, height: h };
  }, [memory, alerts, events]);

  const nodeById = useMemo(() => {
    const m = new Map<string, Node>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  const onNodeClick = (n: Node) => {
    if (n.kind === "alert") setSelection({ kind: "alert", id: n.id.slice(6) });
    else if (n.kind === "spot") setSelection({ kind: "spot", id: n.id.slice(5) });
    else if (n.kind === "sensor") setSelection({ kind: "sensor", id: n.id.slice(7) });
  };

  return (
    <div className="absolute inset-0 z-20 overflow-auto bg-zinc-950 pt-16 text-zinc-100">
      <div className="sticky top-16 z-10 border-b border-zinc-800 bg-zinc-950/95 px-6 py-3 backdrop-blur">
        <h1 className="text-lg font-semibold uppercase tracking-wider text-zinc-100">
          Knowledge graph
        </h1>
        <p className="mt-0.5 text-xs text-zinc-400">
          Schematic of the Neo4j store: memory ← alerts → SPOTs → sensors. Click a
          node to open its detail panel.
        </p>
        <div className="mt-2 flex flex-wrap gap-3 text-[10px] uppercase tracking-wider text-zinc-500">
          <LegendDot color="#c084fc" label="Memory" />
          <LegendDot color="#fb923c" label="Alert" />
          <LegendDot color="#22d3ee" label="SPOT" />
          <LegendDot color="#f8fafc" label="Sensor" />
          <span className="text-zinc-600">·</span>
          <span>
            <span className="text-zinc-300">— solid</span> contributes
          </span>
          <span>
            <span className="text-zinc-300">┄ dashed</span> cites
          </span>
        </div>
      </div>

      <div className="px-6 pb-10 pt-4">
        <svg
          width={COL.sensor + 200}
          height={height}
          className="block"
        >
          {edges.map((e, i) => {
            const a = nodeById.get(e.from);
            const b = nodeById.get(e.to);
            if (!a || !b) return null;
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={e.kind === "cites" ? "#a78bfa" : "#22d3ee"}
                strokeOpacity={0.45}
                strokeWidth={1.25}
                strokeDasharray={e.kind === "cites" ? "4 3" : undefined}
              />
            );
          })}
          {nodes.map((n) => (
            <g
              key={n.id}
              transform={`translate(${n.x}, ${n.y})`}
              className="cursor-pointer"
              onClick={() => onNodeClick(n)}
            >
              <circle
                r={n.kind === "alert" ? 11 : 8}
                fill="#0f172a"
                stroke={n.color}
                strokeWidth={2}
              />
              {n.glyph && (
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={11}
                  fill={n.color}
                >
                  {n.glyph}
                </text>
              )}
              <text
                x={n.kind === "memory" ? -14 : 14}
                y={-2}
                textAnchor={n.kind === "memory" ? "end" : "start"}
                fontSize={11}
                fontWeight={600}
                fill="#e2e8f0"
              >
                {n.label}
              </text>
              {n.sub && (
                <text
                  x={n.kind === "memory" ? -14 : 14}
                  y={11}
                  textAnchor={n.kind === "memory" ? "end" : "start"}
                  fontSize={10}
                  fill="#94a3b8"
                >
                  {n.sub}
                </text>
              )}
            </g>
          ))}
          <ColumnHeader x={COL.memory} label="Memory" />
          <ColumnHeader x={COL.alert} label="Alerts" />
          <ColumnHeader x={COL.spot} label="SPOTs" />
          <ColumnHeader x={COL.sensor} label="Sensors" />
        </svg>

        {nodes.length === 0 && (
          <div className="rounded border border-dashed border-zinc-800 px-6 py-12 text-center text-sm text-zinc-500">
            Graph is empty. Load a scenario or wait for live data.
          </div>
        )}
      </div>
    </div>
  );
}

function ColumnHeader({ x, label }: { x: number; label: string }) {
  return (
    <text
      x={x}
      y={40}
      textAnchor="middle"
      fontSize={11}
      fontWeight={700}
      fill="#71717a"
      style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}
    >
      {label}
    </text>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span
        className="inline-block h-2 w-2 rounded-full border"
        style={{ borderColor: color }}
      />
      {label}
    </span>
  );
}
