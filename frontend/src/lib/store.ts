import { create } from "zustand";
import type {
  AlertEvent,
  LayerId,
  MemoryEntry,
  Selection,
  SpotEvent,
} from "./types";

export type View = "live" | "graph" | "memory";
export type LeftPanelId = "alerts" | "layers" | "settings";

interface MapState {
  view: View;
  events: SpotEvent[];
  alerts: AlertEvent[];
  memory: MemoryEntry[];
  selection: Selection;
  visibleLayers: Set<LayerId>;
  chatOpen: boolean;
  chatPrefill: string;
  leftPanel: LeftPanelId | null;
  autoFlyToAlerts: boolean;
  showWatermark: boolean;

  setView: (v: View) => void;
  addSpot: (e: SpotEvent) => void;
  addAlert: (a: AlertEvent) => void;
  addMemory: (m: MemoryEntry) => void;
  setSelection: (s: Selection) => void;
  toggleLayer: (id: LayerId) => void;
  openChat: (prefill?: string) => void;
  closeChat: () => void;
  toggleLeftPanel: (id: LeftPanelId) => void;
  closeLeftPanel: () => void;
  setAutoFlyToAlerts: (v: boolean) => void;
  setShowWatermark: (v: boolean) => void;
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
  view: "live",
  events: [],
  alerts: [],
  memory: [],
  selection: null,
  visibleLayers: new Set(ALL_LAYERS),
  chatOpen: false,
  chatPrefill: "",
  leftPanel: "alerts",
  autoFlyToAlerts: true,
  showWatermark: true,

  setView: (v) => set({ view: v }),
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
  setAutoFlyToAlerts: (v) => set({ autoFlyToAlerts: v }),
  setShowWatermark: (v) => set({ showWatermark: v }),
}));
