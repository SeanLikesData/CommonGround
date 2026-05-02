import { useEffect, useRef } from "react";
import { useMapStore } from "./store";
import type { TapeLine } from "./types";

export function useTapePlayer(tape: TapeLine[] | null) {
  const dispatched = useRef<Set<number>>(new Set());
  const prevScenario = useRef<string | null>(null);

  const playing = useMapStore((s) => s.playing);
  const speed = useMapStore((s) => s.speed);
  const scenarioTime = useMapStore((s) => s.scenarioTime);
  const scenario = useMapStore((s) => s.scenario);
  const setScenarioTime = useMapStore((s) => s.setScenarioTime);
  const addSpot = useMapStore((s) => s.addSpot);
  const addAlert = useMapStore((s) => s.addAlert);
  const addMemory = useMapStore((s) => s.addMemory);

  // Reset dispatch tracking on scenario change.
  useEffect(() => {
    if (prevScenario.current !== scenario) {
      dispatched.current = new Set();
      prevScenario.current = scenario;
    }
  }, [scenario]);

  // Drain events whose t <= scenarioTime.
  useEffect(() => {
    if (!tape) return;
    for (let i = 0; i < tape.length; i++) {
      const line = tape[i];
      if (line.t > scenarioTime) break;
      if (dispatched.current.has(i)) continue;
      dispatched.current.add(i);
      switch (line.kind) {
        case "spot":
          addSpot(line.payload);
          break;
        case "alert":
          addAlert(line.payload);
          break;
        case "memory":
          addMemory(line.payload);
          break;
      }
    }
  }, [tape, scenarioTime, addSpot, addAlert, addMemory]);

  // Tick scenarioTime while playing.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const next = useMapStore.getState().scenarioTime + dt * speed;
      setScenarioTime(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, setScenarioTime]);
}
