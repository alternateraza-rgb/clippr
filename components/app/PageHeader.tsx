"use client";

import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/components/motion/usePrefersReducedMotion";
import { base } from "@/components/motion/presets";
import { cn } from "@/lib/cn";

/**
 * Every workspace page opens the same way: eyebrow, display line, one sentence
 * of orientation, optional action. Repetition is the point — it is what makes
 * separate pages feel like one app.
 */
export function PageHeader({
  eyebrow,
  title,
  lede,
  action,
  className,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();

  return (
    <motion.header
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={base}
      className={cn("flex flex-wrap items-end justify-between gap-6", className)}
    >
      <div className="min-w-0">
        <p className="eyebrow text-brand">{eyebrow}</p>
        <h1 className="display mt-3 text-[clamp(28px,3.6vw,40px)] text-ink">{title}</h1>
        {lede ? <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-body">{lede}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </motion.header>
  );
}
