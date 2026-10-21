"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { EASE } from "@/components/motion/presets";
import { usePrefersReducedMotion } from "@/components/motion/usePrefersReducedMotion";
import { cn } from "@/lib/cn";

export type BarRow = {
  key: string;
  label: string;
  value: number;
  /** What's printed at the end of the row. Defaults to the value. */
  display?: string;
  /** A second, quieter figure — "avg 74". */
  detail?: string;
  /** A css colour. Rows without one share the first series colour. */
  color?: string;
  href?: string;
};

/**
 * A ranked list where each row is its own bar. The label and the number are
 * printed, so the bar only has to say "how much, relatively" — which makes it
 * the one chart here that reads fine at phone width.
 */
export function BarList({
  rows,
  max,
  className,
}: {
  rows: BarRow[];
  /** Fixed scale, e.g. 100 for scores. Defaults to the largest row. */
  max?: number;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));

  return (
    <ul className={cn("flex flex-col gap-1", className)}>
      {rows.map((row, i) => {
        const pct = Math.max(0, Math.min(1, row.value / top)) * 100;
        const body = (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-sm text-ink">{row.label}</span>
              <span className="flex shrink-0 items-baseline gap-2">
                {row.detail ? <span className="tnum text-caption text-muted">{row.detail}</span> : null}
                <span className="tnum text-sm font-medium text-ink">{row.display ?? row.value}</span>
                {row.href ? (
                  <ChevronRight
                    className="h-3.5 w-3.5 self-center text-muted transition-transform duration-[var(--dur-fast)] group-hover:translate-x-0.5 group-hover:text-ink"
                    strokeWidth={2}
                  />
                ) : null}
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full rounded-full bg-surface-warm">
              <motion.div
                initial={reduced ? false : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.7, ease: EASE, delay: reduced ? 0 : 0.05 + i * 0.04 }}
                className="h-full origin-left rounded-full"
                style={{
                  width: row.value ? `max(${pct}%, 6px)` : 0,
                  background: row.color ?? "var(--color-series-1)",
                }}
              />
            </div>
          </>
        );
        return (
          <li key={row.key}>
            {row.href ? (
              <Link
                href={row.href}
                className="group -mx-2 block rounded-control px-2 py-2 transition-colors duration-[var(--dur-fast)] hover:bg-surface-warm"
              >
                {body}
              </Link>
            ) : (
              <div className="py-2">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
