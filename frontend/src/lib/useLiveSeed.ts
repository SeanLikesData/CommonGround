import { useEffect } from "react";
import {
  fetchAlerts,
  fetchMemories,
  fetchSpotReports,
} from "./spotReports";
import { useMapStore } from "./store";

const POLL_INTERVAL_MS = 3000;

// Polls /reports for spots and /alerts for fused alerts. Memories are still
// seeded once from a static JSON file.
export function useLiveSeed() {
  useEffect(() => {
    let cancelled = false;

    const ingestSpots = async () => {
      try {
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
        console.log(
          `[useLiveSeed] poll spots fetched=${spots.length} new=${added} total=${state.events.length + added}`,
        );
      } catch (err) {
        console.error("[useLiveSeed] spot poll error", err);
      }
    };

    const ingestAlerts = async () => {
      try {
        const alerts = await fetchAlerts();
        if (cancelled) return;
        const state = useMapStore.getState();
        for (const a of alerts) state.upsertAlert(a);
        console.log(
          `[useLiveSeed] poll alerts fetched=${alerts.length} total=${useMapStore.getState().alerts.length}`,
        );
      } catch (err) {
        console.error("[useLiveSeed] alert poll error", err);
      }
    };

    fetchMemories()
      .then((memories) => {
        if (cancelled) return;
        const state = useMapStore.getState();
        const seen = new Set(state.memory.map((m) => m.id));
        for (const m of memories) {
          if (!seen.has(m.id)) state.addMemory(m);
        }
      })
      .catch((err) => console.error("memories seed error", err));

    ingestSpots();
    ingestAlerts();
    const interval = window.setInterval(() => {
      ingestSpots();
      ingestAlerts();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);
}
