import { cn } from "@/lib/cn";

/**
 * A sweep rather than a pulse — opacity flashing on a warm canvas reads as a
 * bug, a moving highlight reads as loading.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-card,16px)] bg-surface-warm",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-[sweep_1.6s_infinite]",
        "after:bg-gradient-to-r after:from-transparent after:via-white/60 after:to-transparent",
        className,
      )}
    />
  );
}
