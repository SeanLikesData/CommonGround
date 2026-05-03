import type { Severity } from "./symbology";
import type { AlertEvent, MemoryEntry, SpotEvent, SpotSource } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// Alerts and memories are not yet served by the API; keep them on static
// JSON until the corresponding Mongo collections + endpoints exist.
const ALERTS_URL = "/data/alerts.json";
const MEMORIES_URL = "/data/memories.json";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
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
let latestSignalMs = 0;

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
  if (ts > latestSignalMs) latestSignalMs = ts;

  const sp = r.spot_report;
  const severity: Severity =
    (sp?.threat_level && SEVERITY_BY_THREAT[sp.threat_level]) ?? "low";
  const salute =
    sp?.narrative ||
    (sp ? buildSaluteFromFields(sp) : "") ||
    `${r.modality} signal`;

  return {
    id: r._id,
    t: (ts - epochMs) / 1000,
    location: [loc.lon, loc.lat],
    severity,
    source,
    sensorId: r.signal.sensor_id,
    salute,
  };
}

export async function fetchSpotReports(since?: Date): Promise<SpotEvent[]> {
  const url = new URL("/reports", API_URL);
  url.searchParams.set("limit", "500");
  if (since) url.searchParams.set("since", since.toISOString());
  const reports = await fetchJson<ApiReport[]>(url.toString());
  const events: SpotEvent[] = [];
  for (const r of reports) {
    const e = mapReport(r);
    if (e) events.push(e);
  }
  return events;
}

// Latest source-signal timestamp seen so far, for `since=` polling.
export function getLatestSignalTimestamp(): Date | null {
  return latestSignalMs > 0 ? new Date(latestSignalMs) : null;
}

export function fetchAlerts(): Promise<AlertEvent[]> {
  return fetchJson<AlertEvent[]>(ALERTS_URL);
}

export function fetchMemories(): Promise<MemoryEntry[]> {
  return fetchJson<MemoryEntry[]>(MEMORIES_URL);
}
