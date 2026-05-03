import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";

const AGENT_URL = import.meta.env.VITE_AGENT_URL ?? "http://localhost:8001";

interface GraphNode {
  id: string;
  label: string;
  props: Record<string, unknown>;
  // populated client-side
  degree?: number;
  // mutated by force-graph
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
}

interface GraphPayload {
  nodes: GraphNode[];
  links: GraphLink[];
}

const LABEL_COLORS: Record<string, string> = {
  Region: "#fb923c",
  Location: "#facc15",
  Modality: "#a78bfa",
  Sensor: "#f8fafc",
  Signal: "#22d3ee",
  Report: "#34d399",
  // Graphiti-extracted semantic nodes
  Entity: "#f472b6",
  Episodic: "#60a5fa",
  Community: "#fbbf24",
};

function colorFor(label: string): string {
  return LABEL_COLORS[label] ?? "#94a3b8";
}

function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

function displayName(n: GraphNode): string {
  const p = n.props;
  switch (n.label) {
    case "Modality":
      return String(p.name ?? "modality").toUpperCase();
    case "Sensor":
      return String(p.id ?? shortId(n.id));
    case "Region":
    case "Location":
      return String(p.geohash ?? shortId(n.id));
    case "Signal": {
      const mod = p.modality ? String(p.modality).toUpperCase() : "SIG";
      const ts = typeof p.timestamp === "string" ? p.timestamp.slice(11, 19) : "";
      return ts ? `${mod} ${ts}` : mod;
    }
    case "Report": {
      const mod = p.modality ? String(p.modality).toUpperCase() : "RPT";
      const narrative =
        typeof p.narrative === "string" && p.narrative.length > 0
          ? p.narrative.slice(0, 28) + (p.narrative.length > 28 ? "…" : "")
          : "";
      return narrative ? `${mod}: ${narrative}` : mod;
    }
    case "Entity":
      return String(p.name ?? p.summary ?? shortId(n.id));
    case "Episodic":
      return String(p.name ?? p.source ?? shortId(n.id));
    case "Community":
      return String(p.name ?? p.summary ?? shortId(n.id));
    default:
      return String(p.name ?? shortId(n.id));
  }
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function fmtCoord(lat: unknown, lon: unknown): string | null {
  const la = typeof lat === "number" ? lat : Number(lat);
  const lo = typeof lon === "number" ? lon : Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  return `${la.toFixed(3)}°, ${lo.toFixed(3)}°`;
}

function trunc(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

// Returns HTML rendered by react-force-graph-2d's tooltip layer.
function tooltipFor(n: GraphNode): string {
  const p = n.props;
  const title = `<div style="font-weight:600;color:${colorFor(n.label)};font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px;">${escHtml(n.label)}</div>`;
  const lines: string[] = [];

  switch (n.label) {
    case "Location":
    case "Region": {
      if (p.geohash) lines.push(`<div><b>geohash</b> ${escHtml(String(p.geohash))}</div>`);
      const c = fmtCoord(p.lat, p.lon);
      if (c) lines.push(`<div>${c}</div>`);
      break;
    }
    case "Modality":
      if (p.name) lines.push(`<div>${escHtml(String(p.name).toUpperCase())}</div>`);
      break;
    case "Sensor": {
      if (p.id) lines.push(`<div><b>id</b> ${escHtml(String(p.id))}</div>`);
      if (p.modality) lines.push(`<div><b>modality</b> ${escHtml(String(p.modality))}</div>`);
      if (p.last_seen_at)
        lines.push(`<div><b>last seen</b> ${escHtml(String(p.last_seen_at))}</div>`);
      break;
    }
    case "Signal": {
      if (p.modality) lines.push(`<div><b>modality</b> ${escHtml(String(p.modality))}</div>`);
      if (p.timestamp) lines.push(`<div><b>at</b> ${escHtml(String(p.timestamp))}</div>`);
      if (p.id) lines.push(`<div><b>id</b> ${escHtml(shortId(String(p.id)))}</div>`);
      break;
    }
    case "Report": {
      if (p.modality) lines.push(`<div><b>modality</b> ${escHtml(String(p.modality))}</div>`);
      if (p.created_at) lines.push(`<div><b>at</b> ${escHtml(String(p.created_at))}</div>`);
      if (typeof p.narrative === "string" && p.narrative)
        lines.push(
          `<div style="margin-top:4px;max-width:320px;white-space:normal;">${escHtml(trunc(p.narrative, 240))}</div>`,
        );
      break;
    }
    case "Entity": {
      if (p.name) lines.push(`<div><b>${escHtml(String(p.name))}</b></div>`);
      if (typeof p.summary === "string" && p.summary)
        lines.push(
          `<div style="margin-top:2px;max-width:320px;white-space:normal;">${escHtml(trunc(p.summary, 240))}</div>`,
        );
      break;
    }
    case "Episodic": {
      if (p.name) lines.push(`<div><b>${escHtml(String(p.name))}</b></div>`);
      if (p.source) lines.push(`<div><b>source</b> ${escHtml(String(p.source))}</div>`);
      if (typeof p.content === "string" && p.content)
        lines.push(
          `<div style="margin-top:2px;max-width:320px;white-space:normal;">${escHtml(trunc(p.content, 200))}</div>`,
        );
      break;
    }
    case "Community": {
      if (p.name) lines.push(`<div><b>${escHtml(String(p.name))}</b></div>`);
      if (typeof p.summary === "string" && p.summary)
        lines.push(
          `<div style="margin-top:2px;max-width:320px;white-space:normal;">${escHtml(trunc(p.summary, 200))}</div>`,
        );
      break;
    }
    default: {
      const fallback = displayName(n);
      if (fallback) lines.push(`<div>${escHtml(fallback)}</div>`);
    }
  }

  if (lines.length === 0) lines.push(`<div>${escHtml(displayName(n))}</div>`);

  return `<div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:12px;line-height:1.4;color:#e2e8f0;background:rgba(9,9,11,0.95);border:1px solid rgba(63,63,70,0.8);border-radius:4px;padding:6px 8px;">${title}${lines.join("")}</div>`;
}

export default function GraphView() {
  const [data, setData] = useState<GraphPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const fgRef = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>(
    undefined,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${AGENT_URL}/graph?limit=400`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = (await res.json()) as GraphPayload & { error?: string };
      if (payload.error) throw new Error(payload.error);
      const degree = new Map<string, number>();
      for (const l of payload.links) {
        const s = typeof l.source === "string" ? l.source : l.source.id;
        const t = typeof l.target === "string" ? l.target : l.target.id;
        degree.set(s, (degree.get(s) ?? 0) + 1);
        degree.set(t, (degree.get(t) ?? 0) + 1);
      }
      payload.nodes.forEach((n) => (n.degree = degree.get(n.id) ?? 0));
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Stronger repulsion + collision so dense subgraphs don't pile up.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg || !data) return;
    fg.d3Force("charge")?.strength(-220);
    const linkForce = fg.d3Force("link") as
      | { distance: (d: number) => unknown }
      | undefined;
    linkForce?.distance(60);
    fg.d3ReheatSimulation();
  }, [data]);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ width: r.width, height: r.height });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const labelsPresent = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const n of data.nodes) set.add(n.label);
    return [...set].sort();
  }, [data]);

  const nodeCount = data?.nodes.length ?? 0;
  const linkCount = data?.links.length ?? 0;

  return (
    <div className="flex h-full w-full text-zinc-100">
      <div className="flex flex-1 flex-col">
        <div className="border-b border-zinc-800 bg-zinc-950/95 px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-400">
              Live view of the Neo4j knowledge graph. Click a node to inspect.
            </p>
            <div className="flex items-center gap-3 text-[11px] text-zinc-500">
              <span>
                {nodeCount} nodes · {linkCount} edges
              </span>
              <button
                onClick={load}
                disabled={loading}
                className="rounded border border-zinc-700/70 bg-zinc-900 px-2 py-1 text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
              >
                {loading ? "Loading…" : "Refresh"}
              </button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-[10px] uppercase tracking-wider text-zinc-500">
            {labelsPresent.map((l) => (
              <LegendDot key={l} color={colorFor(l)} label={l} />
            ))}
          </div>
        </div>

        <div ref={wrapRef} className="relative flex-1 overflow-hidden bg-zinc-950">
          {error && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              Failed to load graph: {error}
            </div>
          )}
          {!error && data && data.nodes.length === 0 && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded border border-dashed border-zinc-800 px-6 py-12 text-center text-sm text-zinc-500">
              Graph is empty.
            </div>
          )}
          {data && data.nodes.length > 0 && (
            <ForceGraph2D
              ref={fgRef}
              graphData={data}
              width={size.width}
              height={size.height}
              backgroundColor="#09090b"
              cooldownTicks={200}
              d3VelocityDecay={0.35}
              warmupTicks={40}
              nodeRelSize={4}
              nodeVal={(n) => 1 + Math.sqrt((n as GraphNode).degree ?? 0)}
              nodeColor={(n) => colorFor((n as GraphNode).label)}
              nodeLabel={(n) => tooltipFor(n as GraphNode)}
              linkColor={() => "rgba(148,163,184,0.35)"}
              linkDirectionalArrowLength={3}
              linkDirectionalArrowRelPos={1}
              linkLabel={(l) => (l as GraphLink).type}
              onNodeClick={(n) => {
                const node = n as GraphNode;
                setSelected(node);
                if (node.x !== undefined && node.y !== undefined) {
                  fgRef.current?.centerAt(node.x, node.y, 600);
                  fgRef.current?.zoom(3, 600);
                }
              }}
              onBackgroundClick={() => setSelected(null)}
              nodePointerAreaPaint={(n, color, ctx) => {
                const node = n as GraphNode;
                const r = 8 + Math.sqrt(node.degree ?? 0);
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(node.x ?? 0, node.y ?? 0, r, 0, 2 * Math.PI);
                ctx.fill();
              }}
              nodeCanvasObjectMode={() => "after"}
              nodeCanvasObject={(n, ctx, scale) => {
                const node = n as GraphNode;
                // Only draw labels at high zoom OR for the selected node,
                // otherwise dense clusters become a wall of overlapping text.
                const isSelected = node.id === selected?.id;
                if (!isSelected && scale < 2.5) return;
                const text = displayName(node);
                const fontSize = Math.max(10 / scale, 3);
                ctx.font = `${isSelected ? "bold " : ""}${fontSize}px sans-serif`;
                ctx.fillStyle = isSelected ? "#fde68a" : "#e2e8f0";
                ctx.textAlign = "center";
                ctx.textBaseline = "top";
                const r = 4 + Math.sqrt(node.degree ?? 0);
                ctx.fillText(text, node.x ?? 0, (node.y ?? 0) + r + 2);
              }}
            />
          )}
        </div>
      </div>

      <DetailSidebar node={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

interface NeighborEntry {
  direction: "in" | "out";
  type: string;
  node: { id: string; label: string; props: Record<string, unknown> };
}

interface NodeDetail {
  node: { id: string; label: string; props: Record<string, unknown> };
  neighbors: NeighborEntry[];
  error?: string;
}

function DetailSidebar({
  node,
  onClose,
}: {
  node: GraphNode | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<NodeDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!node) {
      setDetail(null);
      setErr(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErr(null);
    fetch(`${AGENT_URL}/graph/node?id=${encodeURIComponent(node.id)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<NodeDetail>;
      })
      .then((d) => {
        if (cancelled) return;
        if (d.error) throw new Error(d.error);
        setDetail(d);
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [node]);

  if (!node) {
    return (
      <aside className="hidden w-80 flex-col border-l border-zinc-800 bg-zinc-900/60 p-4 text-xs text-zinc-500 md:flex">
        Click a node to inspect its properties and connections.
      </aside>
    );
  }

  const props = detail?.node.props ?? node.props;
  const propEntries = Object.entries(props).filter(([k]) => k !== "point");
  const neighbors = detail?.neighbors ?? [];

  // Group neighbors by relationship type + direction for a tidy summary.
  const groups = new Map<string, NeighborEntry[]>();
  for (const n of neighbors) {
    const key = `${n.direction}:${n.type}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(n);
  }

  return (
    <aside className="flex w-80 flex-col border-l border-zinc-800 bg-zinc-900/95">
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: colorFor(node.label) }}
          />
          <div className="flex min-w-0 flex-col">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
              {node.label}
            </span>
            <span className="truncate text-[11px] text-zinc-400">
              {displayName(node)}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="ml-2 shrink-0 rounded px-2 py-0.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          ×
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-3 break-all text-[10px] uppercase tracking-wider text-zinc-500">
          {node.id}
        </div>

        <Section title="Properties">
          {propEntries.length === 0 ? (
            <div className="text-xs text-zinc-500">None.</div>
          ) : (
            <dl className="flex flex-col gap-2 text-xs">
              {propEntries.map(([k, v]) => (
                <div key={k} className="flex flex-col gap-0.5">
                  <dt className="text-[10px] uppercase tracking-wider text-zinc-500">
                    {k}
                  </dt>
                  <dd className="break-words text-zinc-200">
                    {formatValue(v)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </Section>

        <Section title={`Connections${neighbors.length ? ` (${neighbors.length})` : ""}`}>
          {loading && (
            <div className="text-xs text-zinc-500">Loading…</div>
          )}
          {err && (
            <div className="rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs text-red-200">
              {err}
            </div>
          )}
          {!loading && !err && neighbors.length === 0 && (
            <div className="text-xs text-zinc-500">No connections.</div>
          )}
          {[...groups.entries()].map(([key, items]) => {
            const [direction, type] = key.split(":");
            const arrow = direction === "out" ? "→" : "←";
            return (
              <div key={key} className="mb-3">
                <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">
                  {arrow} {type} ({items.length})
                </div>
                <ul className="flex flex-col gap-1">
                  {items.slice(0, 12).map((it) => (
                    <li
                      key={`${key}:${it.node.id}`}
                      className="flex items-center gap-2 rounded bg-zinc-950/60 px-2 py-1 text-xs"
                    >
                      <span
                        className="inline-block h-2 w-2 shrink-0 rounded-full"
                        style={{ background: colorFor(it.node.label) }}
                      />
                      <span className="text-zinc-500">{it.node.label}</span>
                      <span className="truncate text-zinc-200">
                        {displayName(it.node as GraphNode)}
                      </span>
                    </li>
                  ))}
                  {items.length > 12 && (
                    <li className="text-[11px] text-zinc-500">
                      +{items.length - 12} more
                    </li>
                  )}
                </ul>
              </div>
            );
          })}
        </Section>
      </div>
    </aside>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
        {title}
      </div>
      {children}
    </div>
  );
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
    return String(v);
  }
  return JSON.stringify(v, null, 2);
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
