import { create } from "zustand";
import type {
  AlertEvent,
  LayerId,
  MemoryEntry,
  Selection,
  SpotEvent,
} from "./types";

export type LeftPanelId =
  | "alerts"
  | "layers"
  | "graph"
  | "memory"
  | "settings";
export type SpotDisplayMode = "merge" | "offset" | "cluster";

const DEFAULT_LEFT_PANEL_WIDTH = 320;
export const MIN_LEFT_PANEL_WIDTH = 240;

interface MapState {
  events: SpotEvent[];
  alerts: AlertEvent[];
  memory: MemoryEntry[];
  selection: Selection;
  visibleLayers: Set<LayerId>;
  chatOpen: boolean;
  chatPrefill: string;
  leftPanel: LeftPanelId | null;
  leftPanelWidth: number;
  autoFlyToAlerts: boolean;
  spotDisplayMode: SpotDisplayMode;

  addSpot: (e: SpotEvent) => void;
  addAlert: (a: AlertEvent) => void;
  addMemory: (m: MemoryEntry) => void;
  setSelection: (s: Selection) => void;
  toggleLayer: (id: LayerId) => void;
  openChat: (prefill?: string) => void;
  closeChat: () => void;
  toggleLeftPanel: (id: LeftPanelId) => void;
  closeLeftPanel: () => void;
  setLeftPanelWidth: (w: number) => void;
  setAutoFlyToAlerts: (v: boolean) => void;
  setSpotDisplayMode: (m: SpotDisplayMode) => void;
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
  leftPanel: "alerts",
  leftPanelWidth: DEFAULT_LEFT_PANEL_WIDTH,
  autoFlyToAlerts: true,
  spotDisplayMode: "merge",

  addSpot: (e) => set((st) => ({ events: [...st.events, e] })),
  addAlert: (a) => set((st) => ({ alerts: [...st.alerts, a] })),
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
  toggleLeftPanel: (id) =>
    set((st) => ({ leftPanel: st.leftPanel === id ? null : id })),
  closeLeftPanel: () => set({ leftPanel: null }),
  setLeftPanelWidth: (w) =>
    set({ leftPanelWidth: Math.max(MIN_LEFT_PANEL_WIDTH, w) }),
  setAutoFlyToAlerts: (v) => set({ autoFlyToAlerts: v }),
  setSpotDisplayMode: (m) => set({ spotDisplayMode: m }),
}));
