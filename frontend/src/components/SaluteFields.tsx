import { parseSalute } from "@/lib/salute";

interface Props {
  salute: string;
  size?: "sm" | "md";
}

export default function SaluteFields({ salute, size = "sm" }: Props) {
  const fields = parseSalute(salute);
  const valueClass = size === "md" ? "text-sm text-zinc-100" : "text-xs text-zinc-200";
  const labelClass =
    size === "md"
      ? "font-mono text-[11px] uppercase tracking-wider text-zinc-500"
      : "font-mono text-[10px] uppercase tracking-wider text-zinc-500";

  if (!fields) {
    return (
      <pre className="whitespace-pre-wrap font-mono text-xs leading-snug text-zinc-200">
        {salute}
      </pre>
    );
  }

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 leading-snug">
      {fields.map((f) => (
        <div key={f.key} className="contents">
          <dt className={labelClass}>{f.label}</dt>
          <dd className={valueClass}>{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}
