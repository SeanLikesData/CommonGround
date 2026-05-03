import type { Severity } from "./symbology";
import type { AlertEvent, MemoryEntry, SpotEvent, SpotSource } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// Memories are not yet served by the API; keep them on static JSON.
const MEMORIES_URL = "/data/memories.json";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetch ${url}: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

interface ApiSignal {
  timestamp: string;
  location?: { lat: number; lon: number };
  coordinates?: { lat: number; lon: number };
  sensor_id?: string;
  [key: string]: unknown;
}

interface ApiSpotReport {
  size?: string;
  activity?: string;
  location_description?: string;
  unit?: string;
  time_dtg?: string;
  equipment?: string;
  threat_level?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  narrative?: string;
}

interface ApiReport {
  _id: string;
  modality: string;
  signal: ApiSignal;
  created_at: string;
  spot_report?: ApiSpotReport;
}

const SOURCE_BY_MODALITY: Record<string, SpotSource> = {
  ugs: "ugs",
  rf: "rf",
  drone_video: "drone",
};

const SEVERITY_BY_THREAT: Record<string, Severity> = {
  LOW: "low",
  MEDIUM: "med",
  HIGH: "high",
  CRITICAL: "high",
};

// Anchor for converting wall-clock timestamps to scenario-relative seconds.
// Captured from the first report seen so playback math stays unchanged.
let epochMs: number | null = null;
let latestCreatedAtMs = 0;

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  const slice = trimmed.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  return `${slice.slice(0, lastSpace > 0 ? lastSpace : max).trimEnd()}…`;
}

function buildSaluteFromFields(sp: ApiSpotReport): string {
  const parts: string[] = [];
  if (sp.size) parts.push(`S: ${sp.size}`);
  if (sp.activity) parts.push(`A: ${sp.activity}`);
  if (sp.location_description) parts.push(`L: ${sp.location_description}`);
  if (sp.unit) parts.push(`U: ${sp.unit}`);
  if (sp.time_dtg) parts.push(`T: ${sp.time_dtg}`);
  if (sp.equipment) parts.push(`E: ${sp.equipment}`);
  return parts.join("; ");
}

function mapReport(r: ApiReport): SpotEvent | null {
  const source = SOURCE_BY_MODALITY[r.modality];
  if (!source) return null;
  const loc = r.signal.location ?? r.signal.coordinates;
  if (!loc) return null;
  const ts = Date.parse(r.signal.timestamp);
  if (Number.isNaN(ts)) return null;

  if (epochMs === null || ts < epochMs) epochMs = ts;
  const createdMs = Date.parse(r.created_at);
  if (!Number.isNaN(createdMs) && createdMs > latestCreatedAtMs) {
    latestCreatedAtMs = createdMs;
  }

  const sp = r.spot_report;
  const severity: Severity =
    (sp?.threat_level && SEVERITY_BY_THREAT[sp.threat_level]) ?? "low";
  const structured = sp ? buildSaluteFromFields(sp) : "";
  const salute = structured || sp?.narrative || `${r.modality} signal`;
  const quote = structured && sp?.narrative ? truncate(sp.narrative, 180) : undefined;

  return {
    id: r._id,
    t: (ts - epochMs) / 1000,
    location: [loc.lon, loc.lat],
    severity,
    source,
    sensorId: r.signal.sensor_id,
    salute,
    quote,
  };
}

export async function fetchSpotReports(since?: Date): Promise<SpotEvent[]> {
  const url = new URL("/reports", API_URL);
  url.searchParams.set("limit", "500");
  if (since) url.searchParams.set("since", since.toISOString());
  const reports = await fetchJson<ApiReport[]>(url.toString());
  const events: SpotEvent[] = [];
  let dropped = 0;
  for (const r of reports) {
    const e = mapReport(r);
    if (e) events.push(e);
    else dropped += 1;
  }
  console.log(
    `[fetchSpotReports] url=${url.toString()} raw=${reports.length} mapped=${events.length} dropped=${dropped}`,
  );
  return events;
}

// Latest report `created_at` seen so far, for `since=` polling. We track
// when the report was written rather than when the source signal occurred,
// because report-gen processes signals out of order.
export function getLatestReportCreatedAt(): Date | null {
  return latestCreatedAtMs > 0 ? new Date(latestCreatedAtMs) : null;
}

interface ApiAlert {
  _id: string;
  geohash: string;
  lat?: number;
  lon?: number;
  severity?: string;
  summary?: string;
  modalities?: string[];
  report_count?: number;
  contributing_report_ids?: string[];
  reasoning?: string | null;
  updated_at?: string;
  latest_report_at?: string | null;
}

const ALERT_SEVERITY: Record<string, Severity> = {
  low: "low",
  med: "med",
  "med-high": "med-high",
  high: "high",
};

function mapAlert(a: ApiAlert): AlertEvent | null {
  if (typeof a.lat !== "number" || typeof a.lon !== "number") return null;
  const tsRaw = a.latest_report_at ?? a.updated_at;
  if (!tsRaw) return null;
  const ts = Date.parse(tsRaw);
  if (Number.isNaN(ts)) return null;
  if (epochMs === null || ts < epochMs) epochMs = ts;
  return {
    id: a._id,
    t: (ts - epochMs) / 1000,
    location: [a.lon, a.lat],
    severity: ALERT_SEVERITY[a.severity ?? "low"] ?? "low",
    summary: a.summary ?? `${a.geohash}: alert`,
    contributingSpotIds: a.contributing_report_ids ?? [],
    citedMemoryIds: [],
    reasoning: a.reasoning ?? undefined,
  };
}

export async function fetchAlerts(): Promise<AlertEvent[]> {
  const url = new URL("/alerts", API_URL);
  url.searchParams.set("limit", "200");
  const raw = await fetchJson<ApiAlert[]>(url.toString());
  const out: AlertEvent[] = [];
  for (const a of raw) {
    const m = mapAlert(a);
    if (m) out.push(m);
  }
  return out;
}

export function fetchMemories(): Promise<MemoryEntry[]> {
  return fetchJson<MemoryEntry[]>(MEMORIES_URL);
}
