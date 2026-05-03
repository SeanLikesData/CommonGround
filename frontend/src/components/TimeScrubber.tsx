import { useCallback, useEffect, useMemo, useRef } from "react";
import { PLAY_DURATIONS, useMapStore, type PlayDuration } from "@/lib/store";
import { severityColor } from "@/lib/symbology";
import { formatDTG } from "@/lib/time";

// "Behind now" delta from the right edge of the track.
function formatBehind(deltaSec: number): string {
  if (deltaSec <= 0) return "live";
  const totalMin = Math.floor(deltaSec / 60);
  if (totalMin < 1) return `${Math.floor(deltaSec)}s behind`;
  if (totalMin < 60) return `${totalMin}m behind`;
  const totalHr = Math.floor(totalMin / 60);
  if (totalHr < 24) {
    const m = totalMin % 60;
    return `${totalHr}h${m.toString().padStart(2, "0")}m behind`;
  }
  const d = Math.floor(totalHr / 24);
  const h = totalHr % 24;
  return `${d}d${h.toString().padStart(2, "0")}h behind`;
}

interface Tick {
  id: string;
  pct: number;
  color: string;
  kind: "spot" | "alert";
}

interface Props {
  bounds: { min: number; max: number } | null;
}

export default function TimeScrubber({ bounds }: Props) {
  const events = useMapStore((s) => s.events);
  const alerts = useMapStore((s) => s.alerts);
  const cursorT = useMapStore((s) => s.cursorT);
  const setCursorT = useMapStore((s) => s.setCursorT);
  const playing = useMapStore((s) => s.playing);
  const togglePlay = useMapStore((s) => s.togglePlay);
  const setPlaying = useMapStore((s) => s.setPlaying);
  const playDuration = useMapStore((s) => s.playDuration);
  const setPlayDuration = useMapStore((s) => s.setPlayDuration);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const wasPlayingRef = useRef(false);

  const span = bounds ? Math.max(1, bounds.max - bounds.min) : 1;
  const effectiveCursor = cursorT ?? bounds?.max ?? 0;

  const ticks = useMemo<Tick[]>(() => {
    if (!bounds || bounds.max <= bounds.min) return [];
    const out: Tick[] = [];
    for (const e of events) {
      out.push({
        id: `s-${e.id}`,
        pct: ((e.t - bounds.min) / span) * 100,
        color: severityColor(e.severity),
        kind: "spot",
      });
    }
    for (const a of alerts) {
      out.push({
        id: `a-${a.id}`,
        pct: ((a.t - bounds.min) / span) * 100,
        color: severityColor(a.severity),
        kind: "alert",
      });
    }
    return out;
  }, [events, alerts, bounds, span]);

  const cursorPct = bounds
    ? ((effectiveCursor - bounds.min) / span) * 100
    : 100;

  const setFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el || !bounds) return;
      const rect = el.getBoundingClientRect();
      const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const t = bounds.min + pct * span;
      setCursorT(t);
    },
    [bounds, span, setCursorT],
  );

  const onPointerDown = (ev: React.PointerEvent<HTMLDivElement>) => {
    if (!bounds) return;
    draggingRef.current = true;
    wasPlayingRef.current = playing;
    if (playing) setPlaying(false);
    (ev.target as Element).setPointerCapture(ev.pointerId);
    setFromClientX(ev.clientX);
  };

  const onPointerMove = (ev: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    setFromClientX(ev.clientX);
  };

  const onPointerUp = (ev: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    (ev.target as Element).releasePointerCapture?.(ev.pointerId);
    // Don't auto-resume — analyst is now scrubbing, let them hit play themselves.
    wasPlayingRef.current = false;
  };

  // Space toggles play/pause (ignore when typing in inputs/textareas).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      togglePlay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay]);

  const onPlayPause = () => {
    if (!bounds) return;
    // If we're at the end, restart from the beginning on play.
    if (!playing && cursorT !== null && cursorT >= bounds.max) {
      setCursorT(bounds.min);
    }
    togglePlay();
  };

  const onJumpToNow = () => setCursorT(null);

  const deltaFromRight = bounds ? bounds.max - effectiveCursor : 0;
  const empty = !bounds || bounds.max <= bounds.min;

  return (
    <div className="flex h-14 shrink-0 items-center gap-3 border-t border-zinc-800 bg-zinc-950/95 px-3 backdrop-blur">
      <button
        onClick={onPlayPause}
        disabled={empty}
        aria-label={playing ? "Pause" : "Play"}
        className="grid h-9 w-9 place-items-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-100 transition-colors enabled:hover:border-cyan-400 enabled:hover:text-cyan-300 disabled:opacity-40"
      >
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <rect x="2" y="1.5" width="3.5" height="11" fill="currentColor" />
            <rect x="8.5" y="1.5" width="3.5" height="11" fill="currentColor" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M3 1.5 L12 7 L3 12.5 Z" fill="currentColor" />
          </svg>
        )}
      </button>

      <div
        className="flex h-9 items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900/70 px-1"
        title="Wall-clock seconds to play through full span"
      >
        {PLAY_DURATIONS.map((d) => {
          const active = d === playDuration;
          return (
            <button
              key={d}
              onClick={() => setPlayDuration(d as PlayDuration)}
              className={`rounded-full px-2.5 py-1 font-mono text-[11px] transition-colors ${
                active
                  ? "bg-cyan-500/20 text-cyan-200"
                  : "text-zinc-400 hover:text-zinc-100"
              }`}
            >
              {d}s
            </button>
          );
        })}
      </div>

      <div className="relative flex-1">
        <div
          ref={trackRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className={`group relative h-9 select-none ${
            empty ? "cursor-default" : "cursor-pointer"
          }`}
        >
          {/* Track baseline */}
          <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-zinc-700/70" />
          {/* Filled portion (left of cursor) */}
          <div
            className="pointer-events-none absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-cyan-400/60"
            style={{ width: `${cursorPct}%` }}
          />
          {/* Event ticks */}
          {ticks.map((t) => (
            <span
              key={t.id}
              className={`pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                t.kind === "alert" ? "h-2.5 w-2.5" : "h-1.5 w-1.5"
              }`}
              style={{
                left: `${t.pct}%`,
                backgroundColor: t.color,
                opacity: t.kind === "alert" ? 0.95 : 0.7,
                boxShadow:
                  t.kind === "alert" ? `0 0 6px ${t.color}` : undefined,
              }}
            />
          ))}
          {/* Cursor */}
          {!empty && (
            <div
              className="pointer-events-none absolute top-1/2 h-7 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-cyan-300"
              style={{ left: `${cursorPct}%` }}
            >
              <span className="absolute -left-[5px] -top-[5px] block h-3 w-3 rounded-full border-2 border-cyan-300 bg-zinc-950" />
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onJumpToNow}
        disabled={empty || cursorT === null}
        className="rounded border border-zinc-800 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-zinc-400 transition-colors enabled:hover:border-cyan-500/60 enabled:hover:text-cyan-200 disabled:opacity-40"
      >
        Jump to now
      </button>

      <div className="flex w-32 flex-col items-end font-mono text-[11px] leading-tight">
        <span className="text-zinc-100">
          {empty ? "—" : formatDTG(effectiveCursor)}
        </span>
        <span className="text-[10px] text-zinc-500">
          {empty ? "—" : formatBehind(deltaFromRight)}
        </span>
      </div>
    </div>
  );
}
