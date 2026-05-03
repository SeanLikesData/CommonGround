import type { SpotEvent } from "./types";

// Stand-in for a real Mongo-backed `/api/spots` endpoint. Reads a static JSON
// file from /public so swapping to `fetch('/api/spots')` later is a one-liner.
const SPOT_REPORTS_URL = "/data/spot-reports.json";

export async function fetchSpotReports(): Promise<SpotEvent[]> {
  const res = await fetch(SPOT_REPORTS_URL);
  if (!res.ok) {
    throw new Error(`fetchSpotReports: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as SpotEvent[];
}
