"use client";

import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/components/motion/usePrefersReducedMotion";
import { cn } from "@/lib/cn";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
};

export function Reveal({ children, className, delay = 0, y = 16 }: RevealProps) {
  const reduced = usePrefersReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: reduced ? 0.2 : 0.7, delay, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function WordReveal({
  text,
  className,
  accentWord,
}: {
  text: string;
  className?: string;
  accentWord?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const words = text.split(" ");

  return (
    <span className={cn("inline", className)}>
      {words.map((word, i) => {
        const clean = word.replace(/[.,]/g, "");
        const isAccent = accentWord
          ? clean.toLowerCase() === accentWord.toLowerCase()
          : false;
        return (
          <motion.span
            key={`${word}-${i}`}
            className="inline-block pr-[0.28em]"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              delay: i * 0.04,
              ease: [0.2, 0.8, 0.2, 1],
            }}
          >
            {isAccent ? <em className="serif-em">{word}</em> : word}
          </motion.span>
        );
      })}
    </span>
  );
}
