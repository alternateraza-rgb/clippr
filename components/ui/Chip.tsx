"use client";

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
      aria-pressed={selected}
      className={cn(
        "inline-flex h-9 select-none items-center rounded-[var(--radius-pill)] px-4 text-[13.5px] font-medium",
        "transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out-soft)] active:scale-[0.98]",
        selected
          ? "bg-ink text-on-brand"
          : "bg-surface text-body shadow-[inset_0_0_0_1px_var(--color-hairline)] hover:bg-surface-warm hover:text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Read-only counterpart: a label, not a control. */
export function Tag({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "brand" | "success" | "warn" | "dark";
  className?: string;
}) {
  const tones = {
    neutral: "bg-surface-warm text-body",
    brand: "bg-brand-soft text-brand",
    success: "bg-success-soft text-success",
    warn: "bg-warn-soft text-warn",
    dark: "bg-white/10 text-white/85",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-1 text-[11.5px] font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
