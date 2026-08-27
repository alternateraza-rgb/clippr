import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge only knows Tailwind's stock scales. Ours are named — `text-d3`,
 * `rounded-card`, `shadow-hairline` — and without registering them it reads
 * `text-d3` as a *colour* and lets `text-ink` delete it. Every custom value in
 * the theme has to be declared here or the merge silently drops sizes.
 */
const merge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["micro", "caption", "md", "d1", "d2", "d3", "d4", "d5", "d6"] },
      ],
      rounded: [
        {
          rounded: [
            "pill",
            "control",
            "control-inner",
            "card",
            "card-inner",
            "panel",
            "panel-inner",
          ],
        },
      ],
      shadow: [
        { shadow: ["hairline", "hairline-strong", "lift", "pop", "brand"] },
      ],
    },
  },
});

/**
 * Joins class names and lets the last one win.
 *
 * The naive join this replaced couldn't resolve conflicts, so a component's
 * default padding and a caller's override both survived into the DOM and the
 * winner came down to stylesheet order. With a token scale in play that has to
 * be decidable.
 */
export function cn(...parts: ClassValue[]) {
  return merge(clsx(parts));
}
