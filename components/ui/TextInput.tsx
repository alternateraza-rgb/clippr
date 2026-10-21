import { cn } from "@/lib/cn";

/**
 * The text field, in one place.
 *
 * Six copies of this class string were living in three files, and they had
 * already drifted into two shapes with no rule about which went where. The
 * rule now: `pill` on the funnel pages, where the field sits beside pill
 * buttons; `control` inside the workspace, where it sits in a form next to
 * other rectangles.
 *
 * The line is an inset shadow, not a border, so focus can thicken it to 1.5px
 * without the field growing and shoving the layout.
 */
export function TextInput({
  shape = "control",
  className,
  ...rest
}: {
  shape?: "pill" | "control";
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={cn(
        "w-full bg-surface text-md text-ink outline-none",
        "shadow-[inset_0_0_0_1px_var(--color-hairline)]",
        "transition-shadow duration-[var(--dur-fast)] ease-[var(--ease-out-soft)]",
        "placeholder:text-muted",
        "hover:shadow-[inset_0_0_0_1px_var(--color-hairline-strong)]",
        "focus:shadow-[inset_0_0_0_1.5px_var(--color-ink)]",
        shape === "pill" ? "rounded-full px-5 py-3.5" : "rounded-control px-4 py-3",
        className,
      )}
    />
  );
}
