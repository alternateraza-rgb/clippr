import { cn } from "@/lib/cn";

export function Chip({
  children,
  selected,
  onClick,
  className,
}: {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[var(--radius-control,9999px)] px-4 py-2 text-[14px] transition-all duration-200 ease-[var(--ease-out-soft)]",
        selected
          ? "bg-brand text-on-brand shadow-hairline"
          : "bg-surface-warm text-body shadow-hairline hover:bg-surface-warm-alt",
        className,
      )}
    >
      {children}
    </button>
  );
}
