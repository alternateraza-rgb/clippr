"use client";

import { motion } from "framer-motion";
import { fast } from "@/components/motion/presets";
import { usePrefersReducedMotion } from "@/components/motion/usePrefersReducedMotion";

/**
 * Navigation should feel instant. This used to fade *and* travel over 350ms,
 * which ran on top of every page's own entrance — two animations arguing, and
 * a nav click that felt like it hadn't registered. Opacity only, and quick:
 * the content underneath does the staggering.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const reduced = usePrefersReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={reduced ? { duration: 0 } : fast}
    >
      {children}
    </motion.div>
  );
}
