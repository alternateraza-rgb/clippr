"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "framer-motion";
import { EASE } from "@/components/motion/presets";
import { usePrefersReducedMotion } from "@/components/motion/usePrefersReducedMotion";

/**
 * A number that arrives rather than appearing.
 *
 * Counts once, when it scrolls into view. Pair it with `.tnum` at the call
 * site or the digits reflow on every frame and the whole line shimmies.
 *
 * Formatting is described with plain values rather than a callback: the call
 * sites are Server Components, and a function can't cross that boundary.
 */
export function CountUp({
  to,
  prefix = "",
  suffix = "",
  decimals = 0,
  group = true,
  duration = 1.1,
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  /** Thousands separators. Off for small workspace counts. */
  group?: boolean;
  duration?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [counted, setCounted] = useState(0);

  useEffect(() => {
    if (!inView || reduced) return;
    const controls = animate(0, to, {
      duration,
      ease: EASE,
      onUpdate: setCounted,
    });
    return () => controls.stop();
  }, [inView, reduced, to, duration]);

  // Reduced motion lands on the final number during render, so there's no
  // effect writing state just to skip an animation.
  const value = reduced ? to : counted;
  const body = group
    ? value.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : value.toFixed(decimals);

  return (
    <span ref={ref}>
      {prefix}
      {body}
      {suffix}
    </span>
  );
}
