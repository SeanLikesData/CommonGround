export const SALUTE_LABELS: Record<string, string> = {
  S: "Size",
  A: "Activity",
  L: "Location",
  U: "Unit",
  T: "Time",
  E: "Equipment",
};

export interface SaluteField {
  key: string;
  label: string;
  value: string;
}

// Parse the seed's `;`-delimited "S: …; A: …" form. Returns null if it doesn't
// look like SALUTE so callers can fall back to rendering the raw string.
export function parseSalute(raw: string): SaluteField[] | null {
  const parts = raw.split(/;\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const fields: SaluteField[] = [];
  for (const part of parts) {
    const m = part.match(/^([A-Za-z])\s*:\s*(.+)$/);
    if (!m) return null;
    const key = m[1].toUpperCase();
    const label = SALUTE_LABELS[key];
    if (!label) return null;
    fields.push({ key, label, value: m[2].trim() });
  }
  return fields;
}
