"use client";

import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/components/motion/usePrefersReducedMotion";
import { fast, slow } from "@/components/motion/presets";

/** One entrance for the whole marketing site: up a little, in once. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 14,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduced = usePrefersReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={reduced ? { ...fast, delay } : { ...slow, delay }}
    >
      {children}
    </motion.div>
  );
}
