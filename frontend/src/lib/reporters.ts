import type { SpotSource } from "./types";

export interface ReporterMeta {
  source: SpotSource;
  glyph: string;
  label: string;
}

export const REPORTERS: ReporterMeta[] = [
  { source: "drone", glyph: "●", label: "Drone" },
  { source: "ugs", glyph: "▲", label: "UGS" },
  { source: "rf", glyph: "◆", label: "RF" },
  { source: "human", glyph: "★", label: "Human" },
  { source: "i-ugs", glyph: "■", label: "I-UGS" },
];

const BY_SOURCE = new Map(REPORTERS.map((r) => [r.source, r]));

export function reporterMeta(source: SpotSource): ReporterMeta {
  return BY_SOURCE.get(source) ?? REPORTERS[0];
}

// Best-effort guess at a reporter type from a sensor ID prefix (used when no
// SPOTs have come in for the sensor yet so we can't read it off `source`).
export function reporterFromSensorId(id: string): SpotSource {
  const upper = id.toUpperCase();
  if (upper.startsWith("IUGS")) return "i-ugs";
  if (upper.startsWith("UGS")) return "ugs";
  if (upper.startsWith("RF")) return "rf";
  if (upper.startsWith("UAS") || upper.startsWith("DRONE")) return "drone";
  return "human";
}
