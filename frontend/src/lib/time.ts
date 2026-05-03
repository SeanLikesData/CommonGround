// Anchor for the seed's relative `t` (seconds). Picking a fixed UTC
// instant so we can render real DTGs ("041830ZMAY26") instead of the
// NASA-style "T+H:MM:SS", which isn't how ground-ops analysts read time.
export const MISSION_EPOCH_MS = Date.UTC(2026, 4, 1, 0, 0, 0); // 2026-05-01T00:00:00Z

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

export function tToDate(t: number): Date {
  return new Date(MISSION_EPOCH_MS + t * 1000);
}

// Standard military DTG: DDHHMM[Z]MMMYY (e.g. 011830ZMAY26).
export function formatDTG(t: number): string {
  const d = tToDate(t);
  const dd = pad2(d.getUTCDate());
  const hh = pad2(d.getUTCHours());
  const mm = pad2(d.getUTCMinutes());
  const mon = MONTHS[d.getUTCMonth()];
  const yy = pad2(d.getUTCFullYear() % 100);
  return `${dd}${hh}${mm}Z${mon}${yy}`;
}

// Short Zulu time-of-day (HHMMZ).
export function formatZulu(t: number): string {
  const d = tToDate(t);
  return `${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}Z`;
}
