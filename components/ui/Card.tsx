import { cn } from "@/lib/cn";

/**
 * A card is a hairline and a radius. Anything more — a drop shadow at rest, a
 * gradient, a border that changes colour on hover — and a grid of them starts
 * to buzz.
 */
export function Card({
  children,
  className,
  interactive = false,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-[var(--radius-card)] bg-surface shadow-hairline",
        interactive &&
          "cursor-pointer transition-shadow duration-[var(--dur-base)] ease-[var(--ease-out-soft)] hover:shadow-lift",
        className,
      )}
    >
      {children}
    </div>
  );
}
