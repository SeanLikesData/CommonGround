import { create } from "zustand";
import type {
  AlertEvent,
  LayerId,
  MemoryEntry,
  Selection,
  SpotEvent,
} from "./types";

type Scenario = "wadi_hamrin" | "patrol_hvs" | null;

interface MapState {
  scenario: Scenario;
  events: SpotEvent[];
  alerts: AlertEvent[];
  memory: MemoryEntry[];
  selection: Selection;
  scenarioTime: number;
  playing: boolean;
  speed: 1 | 10 | 100;
  visibleLayers: Set<LayerId>;

  setScenario: (s: Scenario) => void;
  addSpot: (e: SpotEvent) => void;
  addAlert: (a: AlertEvent) => void;
  addMemory: (m: MemoryEntry) => void;
  setSelection: (s: Selection) => void;
  setScenarioTime: (t: number) => void;
  setPlaying: (p: boolean) => void;
  setSpeed: (s: 1 | 10 | 100) => void;
  toggleLayer: (id: LayerId) => void;
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
  scenario: "wadi_hamrin",
  events: [],
  alerts: [],
  memory: [],
  selection: null,
  scenarioTime: 0,
  playing: false,
  speed: 10,
  visibleLayers: new Set(ALL_LAYERS),

  setScenario: (s) =>
    set({
      scenario: s,
      events: [],
      alerts: [],
      memory: [],
      selection: null,
      scenarioTime: 0,
      playing: false,
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
