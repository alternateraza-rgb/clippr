"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { EASE } from "@/components/motion/presets";
import { usePrefersReducedMotion } from "@/components/motion/usePrefersReducedMotion";
import { DataTable, Tip } from "@/components/stats/ChartCard";

export type Series = { key: string; label: string; color: string };
export type Stack = { label: string; hint: string; values: Record<string, number> };

/**
 * Columns split by series, with a 2px gap between segments so neighbours read
 * as separate without an outline. Series stack in legend order, first at the
 * baseline, so the biggest genre has the steadiest base to compare against.
 */
export function StackedColumns({
  series,
  data,
  height = 200,
  caption,
}: {
  series: Series[];
  data: Stack[];
  height?: number;
  caption: string;
}) {
  const reduced = usePrefersReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const totals = data.map((d) => series.reduce((s, x) => s + (d.values[x.key] ?? 0), 0));
  const max = Math.max(1, ...totals);

  return (
    <div>
      <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-1.5">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5 text-caption text-body">
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>

      <div className="relative" style={{ height }} onMouseLeave={() => setHover(null)}>
        {[0.5, 1].map((f) => (
          <div
            key={f}
            className="absolute inset-x-0 border-t border-hairline"
            style={{ bottom: `${f * 100}%` }}
          />
        ))}
        <span className="tnum absolute -top-2 right-0 bg-surface pl-1 text-micro text-muted">{max}</span>
        <div className="absolute inset-x-0 bottom-0 border-t border-hairline-strong" />

        <div className="absolute inset-0 flex items-end gap-[2px]">
          {data.map((d, i) => (
            <button
              key={d.label + i}
              type="button"
              aria-label={`${d.hint}: ${totals[i]} reels`}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="flex h-full min-w-0 flex-1 cursor-default items-end justify-center"
            >
              <motion.span
                initial={reduced ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.6, ease: EASE, delay: reduced ? 0 : i * 0.03 }}
                className="flex w-full max-w-6 origin-bottom flex-col-reverse gap-[2px] transition-opacity duration-[var(--dur-fast)]"
                style={{
                  height: `${(totals[i] / max) * 100}%`,
                  opacity: hover !== null && hover !== i ? 0.45 : 1,
                }}
              >
                {series.map((s, j) => {
                  const v = d.values[s.key] ?? 0;
                  if (!v) return null;
                  // Only the top segment gets the rounded data-end.
                  const isTop = !series.slice(j + 1).some((x) => (d.values[x.key] ?? 0) > 0);
                  return (
                    <span
                      key={s.key}
                      className={isTop ? "rounded-t-[4px]" : undefined}
                      style={{ flexGrow: v, flexBasis: 0, minHeight: 2, background: s.color }}
                    />
                  );
                })}
              </motion.span>
            </button>
          ))}
        </div>

        {hover !== null ? (
          <Tip
            title={data[hover].hint}
            rows={[
              ...series
                .filter((s) => data[hover].values[s.key])
                .map((s) => ({ label: s.label, value: String(data[hover].values[s.key]), color: s.color })),
              ...(totals[hover] ? [] : [{ label: "No reels", value: "" }]),
            ]}
            style={{
              left: `${((hover + 0.5) / data.length) * 100}%`,
              bottom: `calc(${(totals[hover] / max) * 100}% + 10px)`,
            }}
          />
        ) : null}
      </div>

      <div className="mt-2 flex gap-[2px]">
        {data.map((d, i) => (
          <span key={d.label + i} className="min-w-0 flex-1 truncate text-center text-micro text-muted">
            {d.label}
          </span>
        ))}
      </div>

      <DataTable
        caption={caption}
        head={["Month", ...series.map((s) => s.label)]}
        rows={data.map((d) => [d.hint, ...series.map((s) => d.values[s.key] ?? 0)])}
      />
    </div>
  );
}
