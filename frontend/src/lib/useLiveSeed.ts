import { useEffect } from "react";
import {
  fetchAlerts,
  fetchMemories,
  fetchSpotReports,
} from "./spotReports";
import { useMapStore } from "./store";

const POLL_INTERVAL_MS = 3000;

// One-shot seed of alerts/memories from static JSON, plus polling of the
// /reports API for new spot events.
export function useLiveSeed() {
  useEffect(() => {
    let cancelled = false;

    const ingestSpots = async () => {
      try {
        // Always fetch the latest 500 (no `since`) and dedupe by id.
        // Trying to incrementally fetch by timestamp is brittle: report-gen
        // writes reports out of order w.r.t. signal.timestamp, and clock skew
        // between client/server can also drop new rows. Dedupe is cheap.
        const spots = await fetchSpotReports();
        if (cancelled) return;
        const state = useMapStore.getState();
        const seen = new Set(state.events.map((e) => e.id));
        let added = 0;
        for (const s of spots) {
          if (!seen.has(s.id)) {
            state.addSpot(s);
            added += 1;
          }
        }
        if (added > 0) {
          console.debug(`[useLiveSeed] +${added} new spot reports`);
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
