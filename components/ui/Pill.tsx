"use client";

import Link, { useLinkStatus } from "next/link";
import { cn } from "@/lib/cn";

/**
 * Buttons don't float or bounce here — they darken and take a press. Hover lift
 * on a rounded rectangle is the single loudest tell of a template, and it makes
 * the hit target move out from under the cursor.
 */
const variants = {
  primary:
    "bg-brand text-on-brand hover:bg-brand-hover active:bg-brand-press shadow-[inset_0_1px_0_rgb(255_255_255/0.22)]",
  ghost: "bg-surface-warm text-ink hover:bg-surface-warm-alt",
  outline: "bg-surface text-ink shadow-[inset_0_0_0_1px_var(--color-hairline)] hover:bg-surface-warm",
  dark: "bg-ink text-on-brand hover:bg-void",
  text: "bg-transparent text-body hover:text-ink",
} as const;

const sizes = {
  sm: "h-9 px-4 text-[13.5px]",
  md: "h-11 px-5 text-[14.5px]",
  lg: "h-[52px] px-7 text-[16px]",
} as const;

type PillProps = {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  className?: string;
  href?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Rendered ahead of the label and hidden while the button is busy. */
  icon?: React.ReactNode;
};

export function Pill({
  children,
  variant = "primary",
  size = "md",
  className,
  href,
  type = "button",
  onClick,
  disabled,
  loading,
  icon,
}: PillProps) {
  const classes = cn(
    "relative inline-flex select-none items-center justify-center gap-2 rounded-[var(--radius-pill)]",
    "font-medium leading-none whitespace-nowrap",
    "transition-[background-color,color,transform,box-shadow] duration-[var(--dur-fast)] ease-[var(--ease-out-soft)]",
    "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
    variants[variant],
    sizes[size],
    className,
  );

  if (href) {
    // Routes behind the proxy can't always be prefetched, so a click can sit on
    // the old page until the server answers. Say "heard you" immediately.
    return (
      <Link href={href} className={classes}>
        <Label icon={icon}>{children}</Label>
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} className={classes}>
      <Label busy={loading} icon={icon}>
        {children}
      </Label>
    </button>
  );
}

/**
 * The spinner sits on top of the label rather than beside it, so a pill never
 * changes width — or nudges the layout around it — the moment it's clicked.
 */
function Label({
  children,
  busy,
  icon,
}: {
  children: React.ReactNode;
  busy?: boolean;
  icon?: React.ReactNode;
}) {
  const { pending } = useLinkStatus();
  const waiting = busy || pending;

  return (
    <>
      <span
        className={cn(
          "inline-flex items-center gap-2 transition-opacity duration-[var(--dur-fast)]",
          waiting && "opacity-0",
        )}
      >
        {icon}
        {children}
      </span>
      {waiting ? (
        <span aria-hidden className="absolute inset-0 flex items-center justify-center">
          <span className="h-[15px] w-[15px] animate-spin rounded-full border-[2px] border-current border-t-transparent opacity-70" />
        </span>
      ) : null}
      <span className="sr-only" role="status">
        {waiting ? "Loading" : ""}
      </span>
    </>
  );
}
