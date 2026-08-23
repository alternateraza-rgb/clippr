"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/components/motion/usePrefersReducedMotion";
import { springy } from "@/components/motion/presets";
import { cn } from "@/lib/cn";

const variants = {
  primary:
    "bg-brand text-on-brand shadow-hairline hover:bg-brand-hover active:bg-brand-press",
  ghost: "bg-surface-warm text-ink shadow-hairline hover:bg-surface-warm-alt",
  outline: "bg-surface text-ink shadow-hairline hover:bg-surface-warm",
  text: "bg-transparent text-body hover:text-brand underline-offset-4 hover:underline",
};

type PillProps = {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
  href?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export function Pill({
  children,
  variant = "primary",
  className,
  href,
  type = "button",
  onClick,
  disabled,
  loading,
}: PillProps) {
  const reduced = usePrefersReducedMotion();
  const classes = cn(
    "relative inline-flex items-center justify-center gap-2 rounded-[var(--radius-control,9999px)]",
    "px-5 py-2.5 text-[14px] leading-none",
    "transition-colors duration-[var(--dur-fast,140ms)] ease-[var(--ease-out-soft)]",
    "disabled:pointer-events-none disabled:opacity-40",
    variants[variant],
    className,
  );

  const motionProps =
    reduced || disabled || loading
      ? {}
      : {
          whileHover: { y: -1, scale: 1.012 },
          whileTap: { y: 0, scale: 0.985 },
          transition: springy,
        };

  const content = (
    <>
      {loading ? <Spinner /> : null}
      <span className={cn(loading && "opacity-90")}>{children}</span>
    </>
  );

  if (href) {
    return (
      <motion.span className="inline-flex" {...motionProps}>
        <Link href={href} className={classes}>
          {content}
        </Link>
      </motion.span>
    );
  }

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={classes}
      {...motionProps}
    >
      {content}
    </motion.button>
  );
}

/** Sized to the text beside it so the button never changes width mid-action. */
function Spinner() {
  return (
    <span
      aria-hidden
      className="h-3 w-3 shrink-0 animate-spin rounded-full border-[1.5px] border-current border-t-transparent opacity-70"
    />
  );
}
