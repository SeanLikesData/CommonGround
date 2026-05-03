import { useEffect } from "react";
import { fetchAlerts, fetchMemories, fetchSpotReports } from "./spotReports";
import { useMapStore } from "./store";

// Pulls all spots/alerts/memories from the JSON store (stand-in for Mongo)
// and dumps them into the store as the AO's current state.
export function useLiveSeed() {
  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchSpotReports(), fetchAlerts(), fetchMemories()])
      .then(([spots, alerts, memories]) => {
        if (cancelled) return;
        const state = useMapStore.getState();
        const seenSpots = new Set(state.events.map((e) => e.id));
        const seenAlerts = new Set(state.alerts.map((a) => a.id));
        const seenMems = new Set(state.memory.map((m) => m.id));
        for (const s of spots) {
          if (!seenSpots.has(s.id)) {
            seenSpots.add(s.id);
            state.addSpot(s);
          }
        }
        for (const a of alerts) {
          if (!seenAlerts.has(a.id)) {
            seenAlerts.add(a.id);
            state.addAlert(a);
          }
        }
        for (const m of memories) {
          if (!seenMems.has(m.id)) {
            seenMems.add(m.id);
            state.addMemory(m);
          }
        }
      })
      .catch((err) => console.error("live seed load error", err));

    return () => {
      cancelled = true;
    };
  }, []);
}
