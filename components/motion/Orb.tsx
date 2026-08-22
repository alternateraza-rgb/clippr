"use client";

import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/components/motion/usePrefersReducedMotion";
import { cn } from "@/lib/cn";

export function Orb({ className }: { className?: string }) {
  const reduced = usePrefersReducedMotion();

  return (
    <motion.div
      aria-hidden
      className={cn(
        "pointer-events-none absolute rounded-full blur-3xl",
        className,
      )}
      style={{
        background:
          "radial-gradient(circle at 30% 30%, rgba(196,90,102,0.42), rgba(143,36,48,0.18) 42%, rgba(253,252,252,0) 72%)",
      }}
      animate={
        reduced
          ? { opacity: 0.7 }
          : { opacity: [0.55, 0.85, 0.6], x: [0, 24, -8], y: [0, -16, 10] }
      }
      transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}
