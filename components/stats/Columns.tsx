"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { EASE } from "@/components/motion/presets";
import { usePrefersReducedMotion } from "@/components/motion/usePrefersReducedMotion";
import { DataTable, Tip } from "@/components/stats/ChartCard";
import type { Bucket } from "@/lib/stats/compute";

/**
 * Vertical bars from one baseline. One series, so one colour — the title names
 * it and no legend is needed.
 *
 * Only the tallest bar carries its number at rest; hovering any bar reads it
 * out. A number on every bar is a table pretending to be a chart.
 */
export function Columns({
  data,
  unit,
  height = 168,
  emphasizeLast = false,
  caption,
}: {
  data: Bucket[];
  /** "reel" → "1 reel", "4 reels". */
  unit: string;
  height?: number;
  /** Draw the newest bar in brand and the rest muted — for "this week". */
  emphasizeLast?: boolean;
  caption: string;
}) {
  const reduced = usePrefersReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const peak = data.findIndex((d) => d.value === max && d.value > 0);
  const plural = (n: number) => `${n} ${unit}${n === 1 ? "" : "s"}`;

  return (
    <div>
      <div className="relative" style={{ height }} onMouseLeave={() => setHover(null)}>
        {/* Hairline grid at half and full. Recessive, never dashed. */}
        {[0.5, 1].map((f) => (
          <div
            key={f}
            className="absolute inset-x-0 border-t border-hairline"
            style={{ bottom: `${f * 100}%` }}
          />
        ))}
        <div className="absolute inset-x-0 bottom-0 border-t border-hairline-strong" />

        <div className="absolute inset-0 flex items-end gap-[2px]">
          {data.map((d, i) => {
            const pct = (d.value / max) * 100;
            const muted = emphasizeLast && i !== data.length - 1;
            return (
              <button
                key={d.label + i}
                type="button"
                aria-label={`${d.hint ?? d.label}: ${plural(d.value)}`}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                // The hit target is the whole column, not the bar: a zero
                // still has a tooltip, and a short bar is easy to land on.
                className="relative flex h-full min-w-0 flex-1 cursor-default items-end justify-center focus-visible:outline-offset-0"
              >
                {(i === peak && hover === null) ? (
                  <span
                    className="tnum absolute text-caption font-medium text-ink"
                    style={{ bottom: `calc(${pct}% + 4px)` }}
                  >
                    {d.value}
                  </span>
                ) : null}
                <motion.span
                  initial={reduced ? false : { scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.6, ease: EASE, delay: reduced ? 0 : i * 0.025 }}
                  className="block w-full max-w-6 origin-bottom rounded-t-[4px] transition-opacity duration-[var(--dur-fast)]"
                  style={{
                    height: d.value ? `max(${pct}%, 3px)` : 0,
                    background: muted ? "var(--color-hairline-strong)" : "var(--color-series-1)",
                    opacity: hover !== null && hover !== i ? 0.45 : 1,
                  }}
                />
              </button>
            );
          })}
        </div>

        {hover !== null ? (
          <Tip
            title={data[hover].hint ?? data[hover].label}
            rows={[{ label: unit[0].toUpperCase() + unit.slice(1) + "s", value: String(data[hover].value) }]}
            style={{
              left: `${((hover + 0.5) / data.length) * 100}%`,
              bottom: `calc(${(data[hover].value / max) * 100}% + 10px)`,
            }}
          />
        ) : null}
      </div>

      <div className="mt-2 flex gap-[2px]">
        {data.map((d, i) => (
          <span
            key={d.label + i}
            className="tnum min-w-0 flex-1 truncate text-center text-micro text-muted"
            // Thin the labels out when there are many columns.
            style={{ visibility: data.length > 8 && i % 2 !== (data.length - 1) % 2 ? "hidden" : "visible" }}
          >
            {d.label}
          </span>
        ))}
      </div>

      <DataTable
        caption={caption}
        head={["", unit[0].toUpperCase() + unit.slice(1) + "s"]}
        rows={data.map((d) => [d.hint ?? d.label, d.value])}
      />
    </div>
  );
}
