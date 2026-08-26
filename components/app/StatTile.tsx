import { cn } from "@/lib/cn";

/**
 * One number, said once. No sparkline, no percentage-change badge, no icon —
 * a four-tile row of those is what makes a dashboard look generated.
 */
export function StatTile({
  value,
  label,
  hint,
  className,
}: {
  value: React.ReactNode;
  label: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("bg-surface px-5 py-5", className)}>
      <p className="display tnum text-[28px] text-ink">{value}</p>
      <p className="mt-1.5 text-[13px] font-medium text-ink">{label}</p>
      {hint ? <p className="mt-0.5 text-[12.5px] text-muted">{hint}</p> : null}
    </div>
  );
}
