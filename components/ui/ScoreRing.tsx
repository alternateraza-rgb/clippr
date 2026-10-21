import { cn } from "@/lib/cn";

function tone(score: number) {
  if (score >= 80) return "var(--color-brand)";
  if (score >= 60) return "var(--color-ink)";
  return "var(--color-hairline-strong)";
}

/** Out of 100, as an arc. Small, flat, one stroke — not a dashboard gauge. */
export function ScoreRing({
  score,
  size = 40,
  className,
  onDark = false,
}: {
  score: number;
  size?: number;
  className?: string;
  /** Flips the track and numeral for use over a photo or a near-black panel. */
  onDark?: boolean;
}) {
  const stroke = size <= 40 ? 2.5 : 3;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, score));

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={onDark ? "rgba(255,255,255,0.25)" : "var(--color-hairline)"}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={onDark && clamped < 80 ? "#ffffff" : tone(clamped)}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={circ - (clamped / 100) * circ}
          strokeLinecap="round"
        />
      </svg>
      <span
        className={cn(
          "tnum absolute font-display font-semibold tracking-[-0.04em]",
          onDark ? "text-white" : "text-ink",
        )}
        style={{ fontSize: size * 0.36 }}
      >
        {clamped}
      </span>
    </div>
  );
}

/** The same number as a horizontal read, for rows and detail panes. */
export function ScoreBar({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-caption text-muted">{label}</span>
        <span className="tnum text-caption font-medium text-ink">{clamped}</span>
      </div>
      <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-surface-warm-alt">
        <div
          className="h-full rounded-full transition-[width] duration-[var(--dur-slow)] ease-[var(--ease-out-soft)]"
          style={{ width: `${clamped}%`, background: tone(clamped) }}
        />
      </div>
    </div>
  );
}
