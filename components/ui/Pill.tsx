import Link from "next/link";
import { cn } from "@/lib/cn";

const variants = {
  primary:
    "bg-brand text-on-brand hover:bg-brand-hover active:bg-brand-press shadow-hairline",
  ghost:
    "bg-surface-warm text-ink hover:bg-surface-warm-alt shadow-hairline",
  outline:
    "bg-transparent text-ink shadow-hairline hover:bg-surface-warm",
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
};

export function Pill({
  children,
  variant = "primary",
  className,
  href,
  type = "button",
  onClick,
  disabled,
}: PillProps) {
  const classes = cn(
    "inline-flex items-center justify-center rounded-[var(--radius-control,9999px)] px-5 py-2.5 text-[14px] leading-none transition-all duration-200 ease-[var(--ease-out-soft)] active:scale-[0.98] disabled:opacity-40",
    variants[variant],
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}>
      {children}
    </button>
  );
}
