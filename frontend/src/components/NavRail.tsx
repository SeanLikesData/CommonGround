import { useMapStore, type LeftPanelId } from "@/lib/store";

interface RailItem {
  id: LeftPanelId;
  label: string;
  icon: React.ReactNode;
}

const ICON_CLASS = "h-5 w-5";

const ITEMS: RailItem[] = [
  {
    id: "alerts",
    label: "Alerts",
    icon: (
      <svg
        className={ICON_CLASS}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3 2.5 20h19L12 3Z" />
        <path d="M12 10v4" />
        <path d="M12 17.25v.01" />
      </svg>
    ),
  },
  {
    id: "spots",
    label: "Spot reports",
    icon: (
      <svg
        className={ICON_CLASS}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 21s-7-6.5-7-12a7 7 0 1 1 14 0c0 5.5-7 12-7 12Z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    ),
  },
  {
    id: "filters",
    label: "Filters & layers",
    icon: (
      <svg
        className={ICON_CLASS}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 5h18" />
        <path d="M6 12h12" />
        <path d="M10 19h4" />
      </svg>
    ),
  },
  {
    id: "graph",
    label: "Graph",
    icon: (
      <svg
        className={ICON_CLASS}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="6" cy="6" r="2.5" />
        <circle cx="18" cy="6" r="2.5" />
        <circle cx="12" cy="18" r="2.5" />
        <path d="M7.6 7.7 10.6 16" />
        <path d="M16.4 7.7 13.4 16" />
        <path d="M8.5 6h7" />
      </svg>
    ),
  },
  {
    id: "memory",
    label: "Memory",
    icon: (
      <svg
        className={ICON_CLASS}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 5h11l3 3v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
        <path d="M8 9h7" />
        <path d="M8 13h7" />
        <path d="M8 17h4" />
      </svg>
    ),
  },
  {
    id: "flow",
    label: "Architecture flow",
    icon: (
      <svg
        className={ICON_CLASS}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <ellipse cx="12" cy="5" rx="7" ry="2.5" />
        <path d="M5 5v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V5" />
        <path d="M5 11v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" />
      </svg>
    ),
  },
  {
    id: "settings",
    label: "Settings",
    icon: (
      <svg
        className={ICON_CLASS}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.08A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.08A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 1 1 4 0v.08A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.18.5.59.88 1.08 1h.52a2 2 0 1 1 0 4h-.08a1.7 1.7 0 0 0-1.52 1Z" />
      </svg>
    ),
  },
];

export default function NavRail() {
  const active = useMapStore((s) => s.leftPanel);
  const toggle = useMapStore((s) => s.toggleLeftPanel);

  return (
    <nav className="z-40 flex h-full w-12 flex-col items-stretch border-r border-zinc-800 bg-zinc-950/95">
      {ITEMS.map((item) => {
        const on = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => toggle(item.id)}
            title={item.label}
            aria-label={item.label}
            aria-pressed={on}
            className={`group relative flex h-12 items-center justify-center transition-colors ${
              on
                ? "text-cyan-300"
                : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            <span
              className={`absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r ${
                on ? "bg-cyan-400" : "bg-transparent"
              }`}
            />
            {item.icon}
          </button>
        );
      })}
    </nav>
  );
}
