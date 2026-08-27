"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ClipFrame } from "@/components/landing/ClipFrame";
import { usePrefersReducedMotion } from "@/components/motion/usePrefersReducedMotion";
import { SHOWCASE } from "@/lib/fixtures/showcase";

/**
 * The three clips under the headline.
 *
 * They used to sit at a fixed `-rotate-3` / `rotate-3` — a decoration that
 * never changes is the cheapest trick on a landing page, and it reads as one.
 * Now the outer two start splayed and *settle* into line as you scroll past,
 * so the tilt is something the page does rather than something it wears. The
 * centre clip holds still; it's the one that's playing.
 */
export function HeroClips() {
  const reduced = usePrefersReducedMotion();
  const host = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: host,
    offset: ["start 85%", "end 25%"],
  });

  // Called unconditionally, in a fixed order — a `settle()` helper reads
  // nicer but hides hook calls from the linter and from anyone skimming.
  const leftRotate = useTransform(scrollYProgress, [0, 1], [-7, 0]);
  const rightRotate = useTransform(scrollYProgress, [0, 1], [7, 0]);
  const leftY = useTransform(scrollYProgress, [0, 1], [28, 0]);
  const rightY = useTransform(scrollYProgress, [0, 1], [28, 0]);

  if (reduced) {
    return (
      <div
        ref={host}
        className="mx-auto mt-10 grid max-w-[720px] grid-cols-3 items-center gap-3 sm:gap-5 md:mt-12"
      >
        <ClipFrame clip={SHOWCASE[0]} />
        <ClipFrame clip={SHOWCASE[1]} autoplay priority className="scale-[1.06] shadow-pop" />
        <ClipFrame clip={SHOWCASE[2]} />
      </div>
    );
  }

  return (
    <div
      ref={host}
      className="mx-auto mt-10 grid max-w-[720px] grid-cols-3 items-center gap-3 sm:gap-5 md:mt-12"
    >
      <motion.div style={{ rotate: leftRotate, y: leftY }}>
        <ClipFrame clip={SHOWCASE[0]} />
      </motion.div>
      <ClipFrame clip={SHOWCASE[1]} autoplay priority className="scale-[1.06] shadow-pop" />
      <motion.div style={{ rotate: rightRotate, y: rightY }}>
        <ClipFrame clip={SHOWCASE[2]} />
      </motion.div>
    </div>
  );
}
