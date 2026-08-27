import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * One empty state for the whole workspace. There were three of these, all
 * saying the same thing at different sizes with different radii — the drift
 * between near-identical copies is most of what reads as unfinished.
 *
 * No icon in a tinted circle. A dashed hairline says "something belongs here
 * and hasn't arrived yet", which is the actual message; a coloured badge just
 * decorates the absence.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon?: LucideIcon;
  title?: string;
  body: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-card border border-dashed border-hairline-strong",
        "bg-surface px-6 py-14 text-center",
        className,
      )}
    >
      {Icon ? <Icon className="h-5 w-5 text-muted" strokeWidth={1.75} /> : null}
      {title ? (
        <p className={cn("display text-d1 text-ink", Boolean(Icon) && "mt-4")}>{title}</p>
      ) : null}
      <p
        className={cn(
          "max-w-[44ch] text-md text-body",
          Boolean(title || Icon) && "mt-2",
        )}
      >
        {body}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
