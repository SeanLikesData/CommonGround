export const colors = {
  cyan: "#22d3ee",
  magenta: "#e879f9",
  orange: "#fb923c",
  amber: "#fbbf24",
  realGeography: "#94a3b8",
  severity: {
    low: "#4ade80",
    med: "#facc15",
    medHigh: "#fb923c",
    high: "#ef4444",
  },
  panelBg: "rgba(9, 9, 11, 0.85)",
  panelBorder: "rgba(63, 63, 70, 0.7)",
} as const;

export type Severity = "low" | "med" | "med-high" | "high";

export function severityColor(s: Severity): string {
  switch (s) {
    case "low":
      return colors.severity.low;
    case "med":
      return colors.severity.med;
    case "med-high":
      return colors.severity.medHigh;
    case "high":
      return colors.severity.high;
  }
}
