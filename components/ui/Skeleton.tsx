import { cn } from "@/lib/cn";

/**
 * A sweep rather than a pulse — opacity flashing reads as a bug, a moving
 * highlight reads as loading.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-card bg-surface-warm",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-[sweep_1.5s_infinite]",
        "after:bg-gradient-to-r after:from-transparent after:via-white/70 after:to-transparent",
        className,
      )}
    />
  );
}
