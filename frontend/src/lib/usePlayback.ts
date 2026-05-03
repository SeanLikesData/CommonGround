import { useEffect } from "react";
import { useMapStore } from "./store";

// Drives the playback cursor while `playing` is true. Wall-clock
// deltas are converted to mission seconds via playSpeed, so 10× plays
// 10 mission seconds per real second. Stops at the right edge of the
// loaded data.
export function usePlayback(bounds: { min: number; max: number } | null) {
  const playing = useMapStore((s) => s.playing);
  const playSpeed = useMapStore((s) => s.playSpeed);
  const setCursorT = useMapStore((s) => s.setCursorT);
  const setPlaying = useMapStore((s) => s.setPlaying);

  useEffect(() => {
    if (!playing || !bounds || bounds.max <= bounds.min) return;
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const state = useMapStore.getState();
      const current = state.cursorT ?? bounds.max;
      const next = current + dt * playSpeed;
      if (next >= bounds.max) {
        setCursorT(bounds.max);
        setPlaying(false);
        return;
      }
      setCursorT(next);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, playSpeed, bounds, setCursorT, setPlaying]);
}
