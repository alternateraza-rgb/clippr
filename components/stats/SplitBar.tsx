"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { EASE } from "@/components/motion/presets";
import { usePrefersReducedMotion } from "@/components/motion/usePrefersReducedMotion";
import { DataTable } from "@/components/stats/ChartCard";

export type Part = { key: string; label: string; value: number; color: string };

/**
 * One bar, split into shares. For "which of a few" questions — three caption
 * styles, four gameplay tracks — where a donut would make you compare angles.
 *
 * The legend is always there and prints the share, so no part is identified
 * by colour alone.
 */
export function SplitBar({ parts, caption }: { parts: Part[]; caption: string }) {
  const reduced = usePrefersReducedMotion();
  const [hover, setHover] = useState<string | null>(null);
  const total = parts.reduce((s, p) => s + p.value, 0);
  const shown = parts.filter((p) => p.value > 0);
  const pct = (v: number) => (total ? Math.round((v / total) * 100) : 0);

  return (
    <div>
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full">
        {shown.map((p, i) => (
          <motion.span
            key={p.key}
            initial={reduced ? false : { opacity: 0, scaleX: 0.6 }}
            animate={{ opacity: hover && hover !== p.key ? 0.35 : 1, scaleX: 1 }}
            transition={{ duration: 0.5, ease: EASE, delay: reduced ? 0 : i * 0.05 }}
            onMouseEnter={() => setHover(p.key)}
            onMouseLeave={() => setHover(null)}
            className="h-full origin-left"
            style={{ flexGrow: p.value, flexBasis: 0, background: p.color }}
          />
        ))}
      </div>
      <ul className="mt-4 flex flex-col gap-2">
        {parts.map((p) => (
          <li
            key={p.key}
            onMouseEnter={() => setHover(p.key)}
            onMouseLeave={() => setHover(null)}
            className="flex items-center gap-2.5 text-sm transition-opacity duration-[var(--dur-fast)]"
            style={{ opacity: hover && hover !== p.key ? 0.5 : 1 }}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: p.color }} />
            <span className="flex-1 text-body">{p.label}</span>
            <span className="tnum text-caption text-muted">{p.value}</span>
            <span className="tnum w-10 text-right font-medium text-ink">{pct(p.value)}%</span>
          </li>
        ))}
      </ul>
      <DataTable
        caption={caption}
        head={["", "Reels", "Share"]}
        rows={parts.map((p) => [p.label, p.value, `${pct(p.value)}%`])}
      />
    </div>
  );
}
