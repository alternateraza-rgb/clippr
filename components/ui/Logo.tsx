import { cn } from "@/lib/cn";

/**
 * The mark: a play triangle cut into three shards, each one shorter than the
 * last. Play, plus the cut, plus the thing the product actually does — take
 * something long and hand back something short. Terminals are softened so it
 * sits next to the wordmark without feeling like clip art.
 */
export function LogoMark({
  className,
  size = 26,
  tone = "brand",
}: {
  className?: string;
  size?: number;
  /** `brand` on light surfaces, `on-dark` where the page is near-black. */
  tone?: "brand" | "ink" | "on-dark";
}) {
  const fill =
    tone === "ink" ? "var(--color-ink)" : tone === "on-dark" ? "#ffffff" : "var(--color-brand)";

  return (
    <svg
      viewBox="0 0 33 32"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      aria-hidden
      focusable="false"
    >
      <g fill={fill} stroke={fill} strokeWidth={2.4} strokeLinejoin="round">
        <path d="M6 5.5 L11.5 8.25 L11.5 23.75 L6 26.5 Z" />
        <path d="M14.5 9.6 L20 12.35 L20 19.65 L14.5 22.4 Z" />
        <path d="M23 13.6 L27.5 16 L23 18.4 Z" />
      </g>
    </svg>
  );
}
