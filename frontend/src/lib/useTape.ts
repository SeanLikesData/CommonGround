import { useEffect, useState } from "react";
import { pickSource } from "./eventSource";
import { useMapStore } from "./store";
import type { TapeLine } from "./types";

export function useTape(): TapeLine[] | null {
  const scenario = useMapStore((s) => s.scenario);
  const [tape, setTape] = useState<TapeLine[] | null>(null);
  useEffect(() => {
    if (!scenario) {
      setTape(null);
      return;
    }
    let cancelled = false;
    pickSource(scenario)
      .load()
      .then((lines) => {
        if (!cancelled) setTape(lines);
      })
      .catch((err) => console.error("tape load error", err));
    return () => {
      cancelled = true;
    };
  }, [scenario]);
  return tape;
}
