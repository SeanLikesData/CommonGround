import { useEffect } from "react";
import { useMapStore } from "./store";

// Drives the playback cursor while `playing` is true. The full span
// always plays in `playDuration` wall-clock seconds, so cursor advances
// (span / playDuration) mission-seconds per real second regardless of
// how long the loaded window is. Stops at the right edge.
export function usePlayback(bounds: { min: number; max: number } | null) {
  const playing = useMapStore((s) => s.playing);
  const playDuration = useMapStore((s) => s.playDuration);
  const setCursorT = useMapStore((s) => s.setCursorT);
  const setPlaying = useMapStore((s) => s.setPlaying);

  useEffect(() => {
    if (!playing || !bounds || bounds.max <= bounds.min) return;
    const span = bounds.max - bounds.min;
    const missionPerReal = span / playDuration;
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const state = useMapStore.getState();
      const current = state.cursorT ?? bounds.max;
      const next = current + dt * missionPerReal;
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
  }, [playing, playDuration, bounds, setCursorT, setPlaying]);
}
