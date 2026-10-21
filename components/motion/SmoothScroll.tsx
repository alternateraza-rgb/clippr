"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { usePrefersReducedMotion } from "@/components/motion/usePrefersReducedMotion";

/**
 * Momentum scrolling for the marketing site.
 *
 * Half of what reads as "premium site" is that the page carries a little after
 * you stop pushing it. Deliberately *not* mounted on /app — smoothing a
 * working surface fights the person using it, and a library you're scanning
 * should stop where you put it.
 *
 * Anchor links go through Lenis too, otherwise the nav jumps while the rest of
 * the page glides.
 */
export function SmoothScroll() {
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;

    const lenis = new Lenis({
      duration: 1.05,
      // Matches --ease-out-soft closely enough that scrolling and the UI feel
      // like the same material.
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      touchMultiplier: 1.6,
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    const onAnchorClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest?.('a[href^="#"]');
      const href = anchor?.getAttribute("href");
      if (!href || href === "#") return;
      const target = document.querySelector(href);
      if (!target) return;
      event.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -72 });
    };

    document.addEventListener("click", onAnchorClick);
    return () => {
      document.removeEventListener("click", onAnchorClick);
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [reduced]);

  return null;
}
