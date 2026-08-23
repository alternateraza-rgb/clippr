"use client";

import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/components/motion/usePrefersReducedMotion";
import { springy } from "@/components/motion/presets";
import { cn } from "@/lib/cn";

export function Chip({
  children,
  selected,
  onClick,
  className,
}: {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={reduced ? undefined : { y: -1 }}
      whileTap={reduced ? undefined : { scale: 0.97 }}
      transition={springy}
      className={cn(
        "relative rounded-[var(--radius-control,9999px)] px-4 py-2 text-[13.5px]",
        "transition-colors duration-[var(--dur-fast,140ms)] ease-[var(--ease-out-soft)]",
        selected
          ? "bg-ink text-on-brand shadow-hairline"
          : "bg-surface text-body shadow-hairline hover:bg-surface-warm hover:text-ink",
        className,
      )}
    >
      {children}
    </motion.button>
  );
}
