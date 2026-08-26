"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/components/motion/usePrefersReducedMotion";
import { cn } from "@/lib/cn";

/**
 * Cycles one word of the headline. The container is sized to the longest word
 * up front so the line never reflows mid-cycle and shoves the rest of the hero
 * sideways.
 */
export function RotatingWord({
  words,
  className,
  interval = 2200,
}: {
  words: string[];
  className?: string;
  interval?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduced || words.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % words.length), interval);
    return () => clearInterval(t);
  }, [reduced, words.length, interval]);

  const longest = words.reduce((a, b) => (b.length > a.length ? b : a), "");

  return (
    <span className={cn("relative inline-grid text-brand", className)}>
      {/* Invisible sizer: holds the width of the widest word. */}
      <span aria-hidden className="invisible col-start-1 row-start-1">
        {longest}
      </span>
      {words.map((word, n) => (
        <span
          key={word}
          aria-hidden={n !== i}
          className={cn(
            "col-start-1 row-start-1 text-left transition-all duration-500 ease-[var(--ease-out-soft)]",
            n === i ? "translate-y-0 opacity-100 blur-0" : "translate-y-[0.22em] opacity-0 blur-[3px]",
          )}
        >
          {word}
        </span>
      ))}
    </span>
  );
}
