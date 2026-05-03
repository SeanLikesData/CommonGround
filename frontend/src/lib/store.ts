import { create } from "zustand";
import type { Severity } from "./symbology";
import type {
  AlertEvent,
  LayerId,
  MemoryEntry,
  Selection,
  SpotEvent,
  SpotSource,
} from "./types";

export type LeftPanelId =
  | "alerts"
  | "spots"
  | "filters"
  | "graph"
  | "memory"
  | "settings";
export type SpotDisplayMode = "merge" | "offset" | "cluster";

export const ALL_SEVERITIES: Severity[] = ["low", "med", "med-high", "high"];
export const ALL_SOURCES: SpotSource[] = [
  "ugs",
  "rf",
  "drone",
  "human",
  "i-ugs",
];

const DEFAULT_LEFT_PANEL_WIDTH = 320;
export const MIN_LEFT_PANEL_WIDTH = 240;

// Wall-clock seconds it takes to play through the entire loaded span.
// Lower = faster. Cursor advances span/playDuration mission-seconds per
// real second.
export type PlayDuration = 5 | 10 | 30 | 60;
export const PLAY_DURATIONS: PlayDuration[] = [5, 10, 30, 60];

interface MapState {
  events: SpotEvent[];
  alerts: AlertEvent[];
  memory: MemoryEntry[];
  selection: Selection;
  visibleLayers: Set<LayerId>;
  chatOpen: boolean;
  chatPrefill: string;
  sitrepOpen: boolean;
  leftPanel: LeftPanelId | null;
  leftPanelWidth: number;
  autoFlyToAlerts: boolean;
  spotDisplayMode: SpotDisplayMode;
  severityFilter: Set<Severity>;
  sourceFilter: Set<SpotSource>;
  // Playback cursor: when non-null, events with t > cursorT are hidden
  // everywhere (map markers, panels). null means "follow latest data".
  cursorT: number | null;
  playing: boolean;
  playDuration: PlayDuration;

  addSpot: (e: SpotEvent) => void;
  addAlert: (a: AlertEvent) => void;
  upsertAlert: (a: AlertEvent) => void;
  addMemory: (m: MemoryEntry) => void;
  setSelection: (s: Selection) => void;
  toggleLayer: (id: LayerId) => void;
  openChat: (prefill?: string) => void;
  closeChat: () => void;
  openSitrep: () => void;
  closeSitrep: () => void;
  toggleLeftPanel: (id: LeftPanelId) => void;
  closeLeftPanel: () => void;
  setLeftPanelWidth: (w: number) => void;
  setAutoFlyToAlerts: (v: boolean) => void;
  setSpotDisplayMode: (m: SpotDisplayMode) => void;
  toggleSeverityFilter: (s: Severity) => void;
  toggleSourceFilter: (s: SpotSource) => void;
  resetFilters: () => void;
  setCursorT: (t: number | null) => void;
  setPlaying: (v: boolean) => void;
  togglePlay: () => void;
  setPlayDuration: (s: PlayDuration) => void;
}

const ALL_LAYERS: LayerId[] = [
  "sensors",
  "alerts",
  "tracks",
  "nais",
  "inferred",
  "drone-orbit",
  "spots",
];

export const useMapStore = create<MapState>((set) => ({
  events: [],
  alerts: [],
  memory: [],
  selection: null,
  visibleLayers: new Set(ALL_LAYERS),
  chatOpen: false,
  chatPrefill: "",
  sitrepOpen: false,
  leftPanel: "alerts",
  leftPanelWidth: DEFAULT_LEFT_PANEL_WIDTH,
  autoFlyToAlerts: true,
  spotDisplayMode: "merge",
  severityFilter: new Set(ALL_SEVERITIES),
  sourceFilter: new Set(ALL_SOURCES),
  cursorT: null,
  playing: false,
  playDuration: 10,

  addSpot: (e) => set((st) => ({ events: [...st.events, e] })),
  addAlert: (a) => set((st) => ({ alerts: [...st.alerts, a] })),
  upsertAlert: (a) =>
    set((st) => {
      const idx = st.alerts.findIndex((x) => x.id === a.id);
      if (idx === -1) return { alerts: [...st.alerts, a] };
      const next = st.alerts.slice();
      next[idx] = a;
      return { alerts: next };
    }),
  addMemory: (m) => set((st) => ({ memory: [...st.memory, m] })),
  setSelection: (s) => set({ selection: s }),
  toggleLayer: (id) =>
    set((st) => {
      const next = new Set(st.visibleLayers);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { visibleLayers: next };
    }),
  openChat: (prefill = "") => set({ chatOpen: true, chatPrefill: prefill }),
  closeChat: () => set({ chatOpen: false, chatPrefill: "" }),
  openSitrep: () => set({ sitrepOpen: true }),
  closeSitrep: () => set({ sitrepOpen: false }),
  toggleLeftPanel: (id) =>
    set((st) => ({ leftPanel: st.leftPanel === id ? null : id })),
  closeLeftPanel: () => set({ leftPanel: null }),
  setLeftPanelWidth: (w) =>
    set({ leftPanelWidth: Math.max(MIN_LEFT_PANEL_WIDTH, w) }),
  setAutoFlyToAlerts: (v) => set({ autoFlyToAlerts: v }),
  setSpotDisplayMode: (m) => set({ spotDisplayMode: m }),
  toggleSeverityFilter: (s) =>
    set((st) => {
      const next = new Set(st.severityFilter);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return { severityFilter: next };
    }),
  toggleSourceFilter: (s) =>
    set((st) => {
      const next = new Set(st.sourceFilter);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return { sourceFilter: next };
    }),
  resetFilters: () =>
    set({
      severityFilter: new Set(ALL_SEVERITIES),
      sourceFilter: new Set(ALL_SOURCES),
    }),
  setCursorT: (t) => set({ cursorT: t }),
  setPlaying: (v) => set({ playing: v }),
  togglePlay: () => set((st) => ({ playing: !st.playing })),
  setPlayDuration: (s) => set({ playDuration: s }),
}));

export function passesSpotFilter(
  e: SpotEvent,
  state: Pick<MapState, "severityFilter" | "sourceFilter" | "cursorT">,
): boolean {
  if (state.cursorT !== null && e.t > state.cursorT) return false;
  if (!state.severityFilter.has(e.severity)) return false;
  if (!state.sourceFilter.has(e.source)) return false;
  return true;
}

export function passesAlertFilter(
  a: AlertEvent,
  state: Pick<MapState, "severityFilter" | "cursorT">,
): boolean {
  if (state.cursorT !== null && a.t > state.cursorT) return false;
  if (!state.severityFilter.has(a.severity)) return false;
  return true;
}
