import { useEffect, useMemo, useRef, useState } from "react";
import { useMapStore } from "@/lib/store";
import type { SpotSource } from "@/lib/types";

type StaticStageKey =
  | "signals"
  | "reportgen"
  | "reports"
  | "kgupdate"
  | "neo4j"
  | "agent";

type StageKey = StaticStageKey | string; // sensor IDs are dynamic

interface Sensor {
  id: string;
  source: SpotSource;
}

interface Stage {
  key: StageKey;
  label: string;
  sub?: string;
  cx: number;
  cy: number;
  w: number;
  h: number;
  color: string;
}

const W = 280;
const CENTER = W / 2;

const NODE_W = 120;
const NODE_H = 44;

const SENSOR_W = 44;
const SENSOR_H = 22;
const SENSORS_PER_ROW = 5;
const SENSOR_GAP_X = 4;
const SENSOR_ROW_GAP = 8;
const SENSORS_TOP_PAD = 14;

const SENSOR_COLOR = "#22d3ee";
const SOURCE_FALLBACK_COLOR: Record<SpotSource, string> = {
  rf: "#22d3ee",
  ugs: "#22d3ee",
  "i-ugs": "#67e8f9",
  drone: "#a78bfa",
  human: "#facc15",
};

function colorForSource(src: SpotSource): string {
  return SOURCE_FALLBACK_COLOR[src] ?? SENSOR_COLOR;
}

function sourceFromSensorType(sensorType: string | undefined): SpotSource {
  if (!sensorType) return "ugs";
  if (sensorType.startsWith("rf")) return "rf";
  if (sensorType === "i_ugs") return "i-ugs";
  if (sensorType.startsWith("ugs")) return "ugs";
  if (sensorType.startsWith("drone")) return "drone";
  if (sensorType === "human") return "human";
  return "ugs";
}

function sourceFromSensorId(id: string): SpotSource {
  const upper = id.toUpperCase();
  if (upper.startsWith("IUGS") || upper.startsWith("I-UGS")) return "i-ugs";
  if (upper.startsWith("RF")) return "rf";
  if (upper.startsWith("UGS")) return "ugs";
  if (upper.startsWith("DRONE")) return "drone";
  if (upper.startsWith("HUMAN") || upper.startsWith("ANALYST")) return "human";
  return "ugs";
}

function sensorLayoutPosition(index: number): { cx: number; cy: number } {
  const row = Math.floor(index / SENSORS_PER_ROW);
  const col = index % SENSORS_PER_ROW;
  const rowWidth = SENSORS_PER_ROW * SENSOR_W + (SENSORS_PER_ROW - 1) * SENSOR_GAP_X;
  const startX = (W - rowWidth) / 2;
  const cx = startX + col * (SENSOR_W + SENSOR_GAP_X) + SENSOR_W / 2;
  const cy = SENSORS_TOP_PAD + row * (SENSOR_H + SENSOR_ROW_GAP) + SENSOR_H / 2;
  return { cx, cy };
}

function bottomCenter(s: Stage) {
  return { x: s.cx, y: s.cy + s.h / 2 };
}
function topCenter(s: Stage) {
  return { x: s.cx, y: s.cy - s.h / 2 };
}

function pathBetween(from: Stage, to: Stage): string {
  const a = bottomCenter(from);
  const b = topCenter(to);
  if (Math.abs(a.x - b.x) < 1) {
    return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  }
  const midY = (a.y + b.y) / 2;
  return `M ${a.x} ${a.y} C ${a.x} ${midY}, ${b.x} ${midY}, ${b.x} ${b.y}`;
}

interface Edge {
  id: string;
  d: string;
  color: string;
  tokens: number;
  duration: number;
  opacity?: number;
}

const DOWNSTREAM_OF_REPORT: Array<{ key: StaticStageKey; delay: number }> = [
  { key: "reportgen", delay: 0 },
  { key: "reports", delay: 350 },
  { key: "kgupdate", delay: 700 },
  { key: "neo4j", delay: 1050 },
];

export default function FlowDiagram() {
  const events = useMapStore((s) => s.events);
  const alerts = useMapStore((s) => s.alerts);
  const memory = useMapStore((s) => s.memory);

  const [registrySensors, setRegistrySensors] = useState<Sensor[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/geojson/ao-lionheart.geojson")
      .then((r) => r.json())
      .then((geo) => {
        if (cancelled) return;
        type Feature = {
          properties?: Record<string, unknown>;
        };
        const list: Sensor[] = [];
        for (const f of (geo.features ?? []) as Feature[]) {
          const p = f.properties ?? {};
          if (p.feature_type !== "sensor") continue;
          const id = p.label as string | undefined;
          if (!id) continue;
          list.push({
            id,
            source: sourceFromSensorType(p.sensor_type as string | undefined),
          });
        }
        setRegistrySensors(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Add any sensors observed in events that aren't in the geojson registry
  // (drones, human reporters, scenario-only sensor IDs).
  const sensors = useMemo<Sensor[]>(() => {
    const seen = new Map<string, Sensor>();
    for (const s of registrySensors) seen.set(s.id, s);
    for (const e of events) {
      if (!e.sensorId) continue;
      if (seen.has(e.sensorId)) continue;
      seen.set(e.sensorId, {
        id: e.sensorId,
        source: e.source ?? sourceFromSensorId(e.sensorId),
      });
    }
    // Also include un-IDed event sources as a single bucket per source
    // so drone/human still show up even without a stable sensor ID.
    const unkeyedSources = new Set<SpotSource>();
    for (const e of events) {
      if (e.sensorId) continue;
      unkeyedSources.add(e.source);
    }
    for (const src of unkeyedSources) {
      const placeholder = `__src:${src}`;
      if (!seen.has(placeholder)) {
        const label = src === "i-ugs" ? "I-UGS" : src.toUpperCase();
        seen.set(placeholder, { id: placeholder, source: src });
        // Reuse Sensor.id as the unique key; render the label nicely below.
        // Store the display label by stashing on a side map handled in render.
        // (Implemented via a label override in the rendering loop.)
        void label;
      }
    }
    return Array.from(seen.values());
  }, [registrySensors, events]);

  const sensorRows = Math.max(1, Math.ceil(sensors.length / SENSORS_PER_ROW));
  const sensorAreaH =
    SENSORS_TOP_PAD + sensorRows * (SENSOR_H + SENSOR_ROW_GAP) - SENSOR_ROW_GAP + 8;

  // Static stages stack below the sensor area. Spacing between them is fixed.
  const STAGE_SPACING = 90;
  const signalsY = sensorAreaH + 50;
  const staticStages: Stage[] = [
    { key: "signals", label: "MongoDB", sub: "signals", cx: CENTER, cy: signalsY, w: NODE_W, h: NODE_H, color: "#60a5fa" },
    { key: "reportgen", label: "report-gen", sub: "AI", cx: CENTER, cy: signalsY + STAGE_SPACING, w: NODE_W, h: NODE_H, color: "#a78bfa" },
    { key: "reports", label: "MongoDB", sub: "reports", cx: CENTER, cy: signalsY + STAGE_SPACING * 2, w: NODE_W, h: NODE_H, color: "#34d399" },
    { key: "kgupdate", label: "kg-update", cx: CENTER, cy: signalsY + STAGE_SPACING * 3, w: NODE_W, h: NODE_H, color: "#fb923c" },
    { key: "neo4j", label: "Neo4j", sub: "KG", cx: CENTER, cy: signalsY + STAGE_SPACING * 4, w: NODE_W, h: NODE_H, color: "#facc15" },
    { key: "agent", label: "Agent Analyst", cx: CENTER, cy: signalsY + STAGE_SPACING * 4 + 100, w: NODE_W, h: NODE_H, color: "#f472b6" },
  ];
  const staticByKey = Object.fromEntries(
    staticStages.map((s) => [s.key, s] as const),
  ) as Record<StaticStageKey, Stage>;

  const sensorStages: Stage[] = sensors.map((s, i) => {
    const { cx, cy } = sensorLayoutPosition(i);
    const display = s.id.startsWith("__src:")
      ? s.id.slice("__src:".length).toUpperCase()
      : s.id;
    return {
      key: s.id,
      label: display,
      cx,
      cy,
      w: SENSOR_W,
      h: SENSOR_H,
      color: colorForSource(s.source),
    };
  });

  const allStages = [...sensorStages, ...staticStages];

  // Build edges
  const signals = staticByKey.signals;
  const sensorEdges: Edge[] = sensorStages.map((s) => ({
    id: `e-${s.key}`,
    color: s.color,
    tokens: 1,
    duration: 2.6,
    opacity: 0.5,
    d: pathBetween(s, signals),
  }));

  const NEO4J = staticByKey.neo4j;
  const AGENT = staticByKey.agent;
  const NEO4J_RIGHT_X = NEO4J.cx + NEO4J.w / 2;
  const AGENT_RIGHT_X = AGENT.cx + AGENT.w / 2;
  const LOOP_BULGE_X = NEO4J_RIGHT_X + 30;

  const trunkEdges: Edge[] = [
    { id: "e-1", color: "#a78bfa", tokens: 3, duration: 2.4, d: pathBetween(staticByKey.signals, staticByKey.reportgen) },
    { id: "e-2", color: "#34d399", tokens: 3, duration: 2.4, d: pathBetween(staticByKey.reportgen, staticByKey.reports) },
    { id: "e-3", color: "#fb923c", tokens: 2, duration: 2.4, d: pathBetween(staticByKey.reports, staticByKey.kgupdate) },
    { id: "e-4", color: "#facc15", tokens: 2, duration: 2.4, d: pathBetween(staticByKey.kgupdate, staticByKey.neo4j) },
    { id: "e-down", color: "#f472b6", tokens: 2, duration: 2.4, d: pathBetween(staticByKey.neo4j, staticByKey.agent) },
    {
      id: "e-loop",
      color: "#f472b6",
      tokens: 2,
      duration: 2.8,
      d: `M ${AGENT_RIGHT_X} ${AGENT.cy} C ${LOOP_BULGE_X} ${AGENT.cy}, ${LOOP_BULGE_X} ${NEO4J.cy}, ${NEO4J_RIGHT_X} ${NEO4J.cy}`,
    },
  ];

  const edges = [...sensorEdges, ...trunkEdges];
  const totalH = AGENT.cy + AGENT.h / 2 + 24;

  // Boost tracking
  const prevEventCountRef = useRef(0);
  const prevAlertCountRef = useRef(0);
  const prevMemoryCountRef = useRef(0);
  const [boostTokens, setBoostTokens] = useState<Record<string, number>>({});

  function bump(key: string, delay = 0) {
    window.setTimeout(() => {
      setBoostTokens((prev) => ({ ...prev, [key]: (prev[key] ?? 0) + 1 }));
    }, delay);
  }

  useEffect(() => {
    if (events.length > prevEventCountRef.current) {
      const fresh = events.slice(prevEventCountRef.current);
      for (const ev of fresh) {
        const sensorKey = ev.sensorId ?? `__src:${ev.source}`;
        bump(sensorKey, 0);
        bump("signals", 250);
      }
    }
    prevEventCountRef.current = events.length;
  }, [events]);

  useEffect(() => {
    if (alerts.length > prevAlertCountRef.current) {
      const delta = alerts.length - prevAlertCountRef.current;
      for (let i = 0; i < delta; i++) {
        for (const stage of DOWNSTREAM_OF_REPORT) bump(stage.key, stage.delay);
      }
    }
    prevAlertCountRef.current = alerts.length;
  }, [alerts]);

  useEffect(() => {
    if (memory.length > prevMemoryCountRef.current) {
      const delta = memory.length - prevMemoryCountRef.current;
      for (let i = 0; i < delta; i++) bump("agent", 0);
    }
    prevMemoryCountRef.current = memory.length;
  }, [memory]);

  useEffect(() => {
    const id = window.setInterval(() => bump("agent", 0), 7000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex h-full w-full flex-col gap-2 p-3">
      <div className="text-[11px] uppercase tracking-wider text-zinc-500">
        Live data pipeline · {sensors.length} sensors
      </div>
      <div className="flex flex-1 items-start justify-center overflow-auto">
        <svg
          viewBox={`0 0 ${W} ${totalH}`}
          preserveAspectRatio="xMidYMin meet"
          className="h-auto w-full max-w-[340px]"
        >
          <defs>
            {edges.map((e) => (
              <path key={`def-${e.id}`} id={`path-${e.id}`} d={e.d} />
            ))}
          </defs>

          {edges.map((e) => (
            <g key={e.id}>
              <path
                d={e.d}
                fill="none"
                stroke={e.color}
                strokeOpacity={(e.opacity ?? 1) * 0.25}
                strokeWidth={1.5}
              />
              <path
                d={e.d}
                fill="none"
                stroke={e.color}
                strokeOpacity={(e.opacity ?? 1) * 0.55}
                strokeWidth={1.5}
                strokeDasharray="4 8"
                style={{ animation: "dash-march 1.2s linear infinite" }}
              />
              {Array.from({ length: e.tokens }).map((_, i) => {
                const begin = -(e.duration / e.tokens) * i;
                return (
                  <circle
                    key={`${e.id}-tok-${i}`}
                    r={2.4}
                    fill={e.color}
                    style={{ filter: `drop-shadow(0 0 3px ${e.color})` }}
                  >
                    <animateMotion
                      dur={`${e.duration}s`}
                      repeatCount="indefinite"
                      begin={`${begin}s`}
                      rotate="auto"
                    >
                      <mpath href={`#path-${e.id}`} />
                    </animateMotion>
                  </circle>
                );
              })}
            </g>
          ))}

          {allStages.map((s) => {
            const x = s.cx - s.w / 2;
            const y = s.cy - s.h / 2;
            const boostKey = boostTokens[s.key] ?? 0;
            const isSensor = s.h === SENSOR_H;
            const fontSize = isSensor ? 8.5 : 12;
            return (
              <g key={s.key}>
                <rect
                  className="flow-node-ring"
                  x={x - 3}
                  y={y - 3}
                  width={s.w + 6}
                  height={s.h + 6}
                  rx={isSensor ? 6 : 9}
                  ry={isSensor ? 6 : 9}
                  fill="none"
                  stroke={s.color}
                  strokeOpacity={0.5}
                  strokeWidth={1.2}
                />
                {boostKey > 0 && (
                  <rect
                    key={`boost-${s.key}-${boostKey}`}
                    className="flow-node-ring--boost"
                    x={x - 3}
                    y={y - 3}
                    width={s.w + 6}
                    height={s.h + 6}
                    rx={isSensor ? 6 : 9}
                    ry={isSensor ? 6 : 9}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={2}
                  />
                )}
                <rect
                  x={x}
                  y={y}
                  width={s.w}
                  height={s.h}
                  rx={isSensor ? 4 : 6}
                  ry={isSensor ? 4 : 6}
                  fill="#0a0a0a"
                  stroke={s.color}
                  strokeWidth={1.4}
                />
                <text
                  x={s.cx}
                  y={s.sub ? s.cy - 2 : s.cy + (isSensor ? 3 : 4)}
                  textAnchor="middle"
                  fill={s.color}
                  fontSize={fontSize}
                  fontWeight={600}
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                >
                  {s.label}
                </text>
                {s.sub && (
                  <text
                    x={s.cx}
                    y={s.cy + 12}
                    textAnchor="middle"
                    fill="#a1a1aa"
                    fontSize={10}
                    fontFamily="ui-sans-serif, system-ui, sans-serif"
                  >
                    {s.sub}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-zinc-800 pt-2 text-[10px] text-zinc-500">
        <div>
          <div className="text-zinc-300">{events.length}</div>
          <div>signals</div>
        </div>
        <div>
          <div className="text-zinc-300">{alerts.length}</div>
          <div>reports</div>
        </div>
      </div>
    </div>
  );
}
