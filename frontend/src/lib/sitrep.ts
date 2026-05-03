const AGENT_URL = import.meta.env.VITE_AGENT_URL ?? "http://localhost:8001";

export interface SitrepResponse {
  sitrep: string;
  as_of: string;
  window_minutes: number;
  report_count: number;
  alert_count: number;
}

export async function generateSitrep(windowMinutes: number): Promise<SitrepResponse> {
  const res = await fetch(`${AGENT_URL}/sitrep`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ window_minutes: windowMinutes }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`sitrep failed: HTTP ${res.status}${text ? ` — ${text}` : ""}`);
  }
  return (await res.json()) as SitrepResponse;
}
