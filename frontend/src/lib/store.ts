import { create } from "zustand";
import type {
  AlertEvent,
  LayerId,
  MemoryEntry,
  Selection,
  SpotEvent,
} from "./types";

type Scenario = "wadi_hamrin" | "patrol_hvs" | null;

export type View = "live" | "replay" | "graph" | "memory";

interface MapState {
  view: View;
  scenario: Scenario;
  events: SpotEvent[];
  alerts: AlertEvent[];
  memory: MemoryEntry[];
  selection: Selection;
  scenarioTime: number;
  playing: boolean;
  speed: 1 | 10 | 100;
  visibleLayers: Set<LayerId>;
  chatOpen: boolean;
  chatPrefill: string;

  setView: (v: View) => void;
  setScenario: (s: Scenario) => void;
  addSpot: (e: SpotEvent) => void;
  addAlert: (a: AlertEvent) => void;
  addMemory: (m: MemoryEntry) => void;
  setSelection: (s: Selection) => void;
  setScenarioTime: (t: number) => void;
  setPlaying: (p: boolean) => void;
  setSpeed: (s: 1 | 10 | 100) => void;
  toggleLayer: (id: LayerId) => void;
  openChat: (prefill?: string) => void;
  closeChat: () => void;
  reset: () => void;
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
  scenario: null,
  events: [],
  alerts: [],
  memory: [],
  selection: null,
  scenarioTime: 0,
  playing: false,
  speed: 10,
  visibleLayers: new Set(ALL_LAYERS),
  chatOpen: false,
  chatPrefill: "",

  setView: (v) =>
    set({
      view: v,
      scenario: null,
      events: [],
      alerts: [],
      memory: [],
      selection: null,
      scenarioTime: 0,
      playing: false,
    }),
  setScenario: (s) =>
    set({
      scenario: s,
      events: [],
      alerts: [],
      memory: [],
      selection: null,
      scenarioTime: 0,
      playing: s !== null,
    }),
  addSpot: (e) => set((st) => ({ events: [...st.events, e] })),
  addAlert: (a) => set((st) => ({ alerts: [...st.alerts, a] })),
  addMemory: (m) => set((st) => ({ memory: [...st.memory, m] })),
  setSelection: (s) => set({ selection: s }),
  setScenarioTime: (t) => set({ scenarioTime: t }),
  setPlaying: (p) => set({ playing: p }),
  setSpeed: (s) => set({ speed: s }),
  toggleLayer: (id) =>
    set((st) => {
      const next = new Set(st.visibleLayers);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { visibleLayers: next };
    }),
  openChat: (prefill = "") => set({ chatOpen: true, chatPrefill: prefill }),
  closeChat: () => set({ chatOpen: false, chatPrefill: "" }),
  reset: () =>
    set({
      events: [],
      alerts: [],
      memory: [],
      selection: null,
      scenarioTime: 0,
      playing: false,
    }),
}));
