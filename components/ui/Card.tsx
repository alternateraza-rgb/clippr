"use client";

import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/components/motion/usePrefersReducedMotion";
import { base } from "@/components/motion/presets";
import { cn } from "@/lib/cn";

export function Card({
  children,
  className,
  hover = false,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}) {
  const reduced = usePrefersReducedMotion();

  return (
    <motion.div
      onClick={onClick}
      className={cn(
        "rounded-[var(--radius-card,20px)] bg-surface shadow-hairline",
        onClick && "cursor-pointer",
        className,
      )}
      whileHover={hover && !reduced ? { y: -3, boxShadow: "var(--shadow-lift)" } : undefined}
      transition={base}
    >
      {children}
    </motion.div>
  );
}
