import { useEffect, useRef, useState } from "react";
import { useMapStore } from "@/lib/store";
import type { SpotSource } from "@/lib/types";

type StageKey =
  | "rf"
  | "ugs"
  | "iugs"
  | "drone"
  | "human"
  | "signals"
  | "reportgen"
  | "reports"
  | "kgupdate"
  | "neo4j"
  | "agent";

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
const H = 640;
const CENTER = W / 2;
const NODE_W = 120;
const NODE_H = 44;
const SENSOR_W = 48;
const SENSOR_H = 34;

const SENSOR_COLOR = "#22d3ee";

const STAGES: Stage[] = [
  { key: "rf", label: "RF", cx: 28, cy: 28, w: SENSOR_W, h: SENSOR_H, color: SENSOR_COLOR },
  { key: "ugs", label: "UGS", cx: 84, cy: 28, w: SENSOR_W, h: SENSOR_H, color: SENSOR_COLOR },
  { key: "iugs", label: "i-UGS", cx: 140, cy: 28, w: SENSOR_W, h: SENSOR_H, color: SENSOR_COLOR },
  { key: "drone", label: "Drone", cx: 196, cy: 28, w: SENSOR_W, h: SENSOR_H, color: SENSOR_COLOR },
  { key: "human", label: "Human", cx: 252, cy: 28, w: SENSOR_W, h: SENSOR_H, color: SENSOR_COLOR },
  { key: "signals", label: "MongoDB", sub: "signals", cx: CENTER, cy: 130, w: NODE_W, h: NODE_H, color: "#60a5fa" },
  { key: "reportgen", label: "report-gen", sub: "AI", cx: CENTER, cy: 220, w: NODE_W, h: NODE_H, color: "#a78bfa" },
  { key: "reports", label: "MongoDB", sub: "reports", cx: CENTER, cy: 310, w: NODE_W, h: NODE_H, color: "#34d399" },
  { key: "kgupdate", label: "kg-update", cx: CENTER, cy: 400, w: NODE_W, h: NODE_H, color: "#fb923c" },
  { key: "neo4j", label: "Neo4j", sub: "KG", cx: CENTER, cy: 490, w: NODE_W, h: NODE_H, color: "#facc15" },
  { key: "agent", label: "Agent Analyst", cx: CENTER, cy: 590, w: NODE_W, h: NODE_H, color: "#f472b6" },
];

const STAGE_BY_KEY = Object.fromEntries(
  STAGES.map((s) => [s.key, s] as const),
) as Record<StageKey, Stage>;

interface Edge {
  id: string;
  d: string;
  color: string;
  tokens: number;
  duration: number;
}

function bottomCenter(s: Stage) {
  return { x: s.cx, y: s.cy + s.h / 2 };
}
function topCenter(s: Stage) {
  return { x: s.cx, y: s.cy - s.h / 2 };
}

function straightOrCurve(from: Stage, to: Stage): string {
  const a = bottomCenter(from);
  const b = topCenter(to);
  if (Math.abs(a.x - b.x) < 1) {
    return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  }
  const midY = (a.y + b.y) / 2;
  return `M ${a.x} ${a.y} C ${a.x} ${midY}, ${b.x} ${midY}, ${b.x} ${b.y}`;
}

const NEO4J = STAGE_BY_KEY.neo4j;
const AGENT = STAGE_BY_KEY.agent;
const NEO4J_RIGHT_X = NEO4J.cx + NEO4J.w / 2;
const AGENT_RIGHT_X = AGENT.cx + AGENT.w / 2;
const NEO4J_RIGHT_Y = NEO4J.cy;
const AGENT_RIGHT_Y = AGENT.cy;
const LOOP_BULGE_X = NEO4J_RIGHT_X + 30;

const EDGES: Edge[] = [
  { id: "e-rf", color: SENSOR_COLOR, tokens: 1, duration: 2.4, d: straightOrCurve(STAGE_BY_KEY.rf, STAGE_BY_KEY.signals) },
  { id: "e-ugs", color: SENSOR_COLOR, tokens: 1, duration: 2.4, d: straightOrCurve(STAGE_BY_KEY.ugs, STAGE_BY_KEY.signals) },
  { id: "e-iugs", color: SENSOR_COLOR, tokens: 1, duration: 2.4, d: straightOrCurve(STAGE_BY_KEY.iugs, STAGE_BY_KEY.signals) },
  { id: "e-drone", color: SENSOR_COLOR, tokens: 1, duration: 2.4, d: straightOrCurve(STAGE_BY_KEY.drone, STAGE_BY_KEY.signals) },
  { id: "e-human", color: SENSOR_COLOR, tokens: 1, duration: 2.4, d: straightOrCurve(STAGE_BY_KEY.human, STAGE_BY_KEY.signals) },
  { id: "e-1", color: "#a78bfa", tokens: 3, duration: 2.4, d: straightOrCurve(STAGE_BY_KEY.signals, STAGE_BY_KEY.reportgen) },
  { id: "e-2", color: "#34d399", tokens: 3, duration: 2.4, d: straightOrCurve(STAGE_BY_KEY.reportgen, STAGE_BY_KEY.reports) },
  { id: "e-3", color: "#fb923c", tokens: 2, duration: 2.4, d: straightOrCurve(STAGE_BY_KEY.reports, STAGE_BY_KEY.kgupdate) },
  { id: "e-4", color: "#facc15", tokens: 2, duration: 2.4, d: straightOrCurve(STAGE_BY_KEY.kgupdate, STAGE_BY_KEY.neo4j) },
  // Down: Neo4j → Agent (analyst reads the KG)
  { id: "e-down", color: "#f472b6", tokens: 2, duration: 2.4, d: straightOrCurve(STAGE_BY_KEY.neo4j, STAGE_BY_KEY.agent) },
  // Loop: Agent → Neo4j (analyst writes findings back) — curves out to the right
  {
    id: "e-loop",
    color: "#f472b6",
    tokens: 2,
    duration: 2.8,
    d: `M ${AGENT_RIGHT_X} ${AGENT_RIGHT_Y} C ${LOOP_BULGE_X} ${AGENT_RIGHT_Y}, ${LOOP_BULGE_X} ${NEO4J_RIGHT_Y}, ${NEO4J_RIGHT_X} ${NEO4J_RIGHT_Y}`,
  },
];

function sensorStageFor(source: SpotSource): StageKey | null {
  if (source === "rf") return "rf";
  if (source === "ugs") return "ugs";
  if (source === "i-ugs") return "iugs";
  if (source === "drone") return "drone";
  if (source === "human") return "human";
  return null;
}

const DOWNSTREAM_OF_REPORT: Array<{ key: StageKey; delay: number }> = [
  { key: "reportgen", delay: 0 },
  { key: "reports", delay: 350 },
  { key: "kgupdate", delay: 700 },
  { key: "neo4j", delay: 1050 },
];

export default function FlowDiagram() {
  const events = useMapStore((s) => s.events);
  const alerts = useMapStore((s) => s.alerts);
  const memory = useMapStore((s) => s.memory);

  const prevEventCountRef = useRef(events.length);
  const prevAlertCountRef = useRef(alerts.length);
  const prevMemoryCountRef = useRef(memory.length);

  const [boostTokens, setBoostTokens] = useState<Record<StageKey, number>>(
    () =>
      Object.fromEntries(STAGES.map((s) => [s.key, 0])) as Record<
        StageKey,
        number
      >,
  );

  function bump(key: StageKey, delay = 0) {
    window.setTimeout(() => {
      setBoostTokens((prev) => ({ ...prev, [key]: prev[key] + 1 }));
    }, delay);
  }

  useEffect(() => {
    if (events.length > prevEventCountRef.current) {
      const fresh = events.slice(prevEventCountRef.current);
      for (const ev of fresh) {
        const stage = sensorStageFor(ev.source);
        if (stage) bump(stage, 0);
        bump("signals", 250);
      }
    }
    prevEventCountRef.current = events.length;
  }, [events]);

  useEffect(() => {
    if (alerts.length > prevAlertCountRef.current) {
      const delta = alerts.length - prevAlertCountRef.current;
      for (let i = 0; i < delta; i++) {
        for (const stage of DOWNSTREAM_OF_REPORT) {
          bump(stage.key, stage.delay);
        }
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

  // Ambient analyst tick so the loop visibly runs even when no new findings
  // are written.
  useEffect(() => {
    const id = window.setInterval(() => bump("agent", 0), 7000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex h-full w-full flex-col gap-2 p-3">
      <div className="text-[11px] uppercase tracking-wider text-zinc-500">
        Live data pipeline
      </div>
      <div className="flex flex-1 items-start justify-center overflow-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMin meet"
          className="h-auto w-full max-w-[340px]"
        >
          <defs>
            {EDGES.map((e) => (
              <path key={`def-${e.id}`} id={`path-${e.id}`} d={e.d} />
            ))}
          </defs>

          {EDGES.map((e) => (
            <g key={e.id}>
              <path
                d={e.d}
                fill="none"
                stroke={e.color}
                strokeOpacity={0.25}
                strokeWidth={1.5}
              />
              <path
                d={e.d}
                fill="none"
                stroke={e.color}
                strokeOpacity={0.55}
                strokeWidth={1.5}
                strokeDasharray="4 8"
                style={{ animation: "dash-march 1.2s linear infinite" }}
              />
              {Array.from({ length: e.tokens }).map((_, i) => {
                const begin = -(e.duration / e.tokens) * i;
                return (
                  <circle
                    key={`${e.id}-tok-${i}`}
                    r={2.6}
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

          {STAGES.map((s) => {
            const x = s.cx - s.w / 2;
            const y = s.cy - s.h / 2;
            const boostKey = boostTokens[s.key];
            const fontSize = s.w === SENSOR_W ? 10 : 12;
            return (
              <g key={s.key}>
                <rect
                  className="flow-node-ring"
                  x={x - 3}
                  y={y - 3}
                  width={s.w + 6}
                  height={s.h + 6}
                  rx={9}
                  ry={9}
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
                    rx={9}
                    ry={9}
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
                  rx={6}
                  ry={6}
                  fill="#0a0a0a"
                  stroke={s.color}
                  strokeWidth={1.4}
                />
                <text
                  x={s.cx}
                  y={s.sub ? s.cy - 2 : s.cy + 4}
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
