import { cn } from "@/lib/cn";

/**
 * A card is a hairline and a radius. Anything more — a drop shadow at rest, a
 * gradient, a border that blooms on hover — and a grid of them starts to buzz.
 *
 * Interactive cards darken their line and move nothing. Elevation belongs to
 * things that genuinely sit above the page: a sheet, a dialog, a lightbox.
 * The line is drawn with a ring rather than a border so adding one never
 * nudges the layout by a pixel.
 */
export function Card({
  children,
  className,
  interactive = false,
  padding = "md",
  as: Tag = "div",
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  /** `none` when the card's content runs edge to edge — a thumbnail, a list. */
  padding?: "none" | "sm" | "md" | "lg";
  as?: "div" | "article" | "li";
} & React.HTMLAttributes<HTMLElement>) {
  const pad = {
    none: "",
    sm: "p-4",
    md: "p-5",
    lg: "p-7",
  }[padding];

  return (
    <Tag
      className={cn(
        "rounded-card bg-surface shadow-hairline",
        pad,
        interactive &&
          "transition-shadow duration-[var(--dur-base)] ease-[var(--ease-out-soft)] hover:shadow-hairline-strong",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
