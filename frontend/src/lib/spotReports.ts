import type { AlertEvent, MemoryEntry, SpotEvent } from "./types";

// Stand-ins for Mongo-backed /api/{spots,alerts,memories} endpoints. Read
// static JSON from /public so swapping to real fetches is a one-line change.
const SPOT_REPORTS_URL = "/data/spot-reports.json";
const ALERTS_URL = "/data/alerts.json";
const MEMORIES_URL = "/data/memories.json";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url}: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

export function fetchSpotReports(): Promise<SpotEvent[]> {
  return fetchJson<SpotEvent[]>(SPOT_REPORTS_URL);
}

export function fetchAlerts(): Promise<AlertEvent[]> {
  return fetchJson<AlertEvent[]>(ALERTS_URL);
}

export function fetchMemories(): Promise<MemoryEntry[]> {
  return fetchJson<MemoryEntry[]>(MEMORIES_URL);
}
