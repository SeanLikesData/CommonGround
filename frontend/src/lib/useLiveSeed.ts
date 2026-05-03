import { useEffect } from "react";
import {
  fetchAlerts,
  fetchMemories,
  fetchSpotReports,
  getLatestSignalTimestamp,
} from "./spotReports";
import { useMapStore } from "./store";

const POLL_INTERVAL_MS = 5000;

// One-shot seed of alerts/memories from static JSON, plus polling of the
// /reports API for new spot events.
export function useLiveSeed() {
  useEffect(() => {
    let cancelled = false;

    const ingestSpots = async () => {
      try {
        const since = getLatestSignalTimestamp() ?? undefined;
        const spots = await fetchSpotReports(since);
        if (cancelled || spots.length === 0) return;
        const state = useMapStore.getState();
        const seen = new Set(state.events.map((e) => e.id));
        for (const s of spots) {
          if (!seen.has(s.id)) state.addSpot(s);
        }
      } catch (err) {
        console.error("spot-report poll error", err);
      }
    };

    Promise.all([fetchAlerts(), fetchMemories()])
      .then(([alerts, memories]) => {
        if (cancelled) return;
        const state = useMapStore.getState();
        const seenAlerts = new Set(state.alerts.map((a) => a.id));
        const seenMems = new Set(state.memory.map((m) => m.id));
        for (const a of alerts) {
          if (!seenAlerts.has(a.id)) state.addAlert(a);
        }
        for (const m of memories) {
          if (!seenMems.has(m.id)) state.addMemory(m);
        }
      })
      .catch((err) => console.error("alerts/memories seed error", err));

    ingestSpots();
    const interval = window.setInterval(ingestSpots, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);
}
