import type { Severity } from "./symbology";

export type SpotSource = "ugs" | "rf" | "drone" | "human" | "i-ugs";

export interface SpotEvent {
  id: string;
  t: number;
  location: [number, number];
  severity: Severity;
  source: SpotSource;
  sensorId?: string;
  salute: string;
  quote?: string;
  droneClipUrl?: string;
}

export interface AlertEvent {
  id: string;
  t: number;
  location: [number, number];
  severity: Severity;
  summary: string;
  contributingSpotIds: string[];
  citedMemoryIds: string[];
  reasoning?: string;
}

export type MemoryKind = "rule" | "prior" | "reasoning_example";

export interface MemoryEntry {
  id: string;
  t: number;
  kind: MemoryKind;
  text: string;
  source: "seed" | "analyst";
}

export type LayerId =
  | "sensors"
  | "alerts"
  | "tracks"
  | "nais"
  | "inferred"
  | "drone-orbit"
  | "spots";

export type Selection =
  | { kind: "spot"; id: string }
  | { kind: "alert"; id: string }
  | { kind: "sensor"; id: string }
  | { kind: "inferred"; id: string }
  | null;
