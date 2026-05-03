import { useEffect } from "react";
import { TapeSource } from "./eventSource";
import { useMapStore } from "./store";

const LIVE_SEED_TAPES = ["/tapes/wadi-hamrin.jsonl", "/tapes/patrol-hvs.jsonl"];

// Pulls every seeded tape and dumps its SPOTs/alerts/memories into the store as
// the AO's current state. Stand-in for a real /spots feed off Mongo.
export function useLiveSeed() {
  useEffect(() => {
    let cancelled = false;

    Promise.all(LIVE_SEED_TAPES.map((url) => new TapeSource(url).load()))
      .then((tapes) => {
        if (cancelled) return;
        const { addSpot, addAlert, addMemory, events, alerts, memory } =
          useMapStore.getState();
        const seenSpots = new Set(events.map((e) => e.id));
        const seenAlerts = new Set(alerts.map((a) => a.id));
        const seenMems = new Set(memory.map((m) => m.id));
        for (const lines of tapes) {
          for (const line of lines) {
            if (line.kind === "spot" && !seenSpots.has(line.payload.id)) {
              seenSpots.add(line.payload.id);
              addSpot(line.payload);
            } else if (line.kind === "alert" && !seenAlerts.has(line.payload.id)) {
              seenAlerts.add(line.payload.id);
              addAlert(line.payload);
            } else if (line.kind === "memory" && !seenMems.has(line.payload.id)) {
              seenMems.add(line.payload.id);
              addMemory(line.payload);
            }
          }
        }
      })
      .catch((err) => console.error("live seed load error", err));

    return () => {
      cancelled = true;
    };
  }, []);
}
