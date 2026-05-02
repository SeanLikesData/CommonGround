import { useEffect, useState } from "react";
import { pickSource } from "./eventSource";
import type { TapeLine } from "./types";

export function useTape(): TapeLine[] | null {
  const [tape, setTape] = useState<TapeLine[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    pickSource()
      .load()
      .then((lines) => {
        if (!cancelled) setTape(lines);
      })
      .catch((err) => console.error("tape load error", err));
    return () => {
      cancelled = true;
    };
  }, []);
  return tape;
}
