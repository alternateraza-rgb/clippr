"use client";

import { useState } from "react";
import { Tip } from "@/components/stats/ChartCard";
import type { calendar } from "@/lib/stats/compute";

type Calendar = ReturnType<typeof calendar>;

const DAYS = ["Mon", "", "Wed", "", "Fri", "", ""];

/** Steps of one hue. Counts are small, so the steps are absolute, not relative. */
function step(count: number, max: number) {
  if (!count) return 0;
  if (max <= 4) return Math.min(4, count);
  return Math.min(4, Math.ceil((count / max) * 4));
}

/**
 * A day per cell, a week per column. Fills the card's width: the cells are a
 * grid of equal fractions rather than fixed squares, so 26 weeks fit a phone
 * and a wide card without a scrollbar.
 */
export function Heatmap({ data }: { data: Calendar }) {
  const [hover, setHover] = useState<{ w: number; d: number } | null>(null);
  const weeks = data.columns.length;

  // A month label over the first column that starts in that month — unless
  // the last label is too close, which happens when the calendar opens in the
  // final days of a month and the two names would print on top of each other.
  const months: string[] = [];
  let lastLabel = -Infinity;
  data.columns.forEach((col, i) => {
    const first = col[0].date;
    const prev = i > 0 ? data.columns[i - 1][0].date : null;
    const opensMonth = !prev || prev.getMonth() !== first.getMonth();
    // Only label the opening column if most of its month is still to come.
    const worthIt = prev || first.getDate() <= 21;
    if (opensMonth && worthIt && i - lastLabel >= 3) {
      lastLabel = i;
      months.push(first.toLocaleDateString("en-US", { month: "short" }));
    } else {
      months.push("");
    }
  });

  const cell = hover ? data.columns[hover.w][hover.d] : null;

  return (
    <div>
      <div className="flex gap-2">
        <div className="grid shrink-0 grid-rows-7 gap-[3px] pt-[18px] text-micro text-muted">
          {DAYS.map((d, i) => (
            <span key={i} className="flex items-center leading-none">
              {d}
            </span>
          ))}
        </div>
        <div
          className="relative min-w-0 flex-1"
          // Past this width the squares get large enough to look like tiles.
          style={{ maxWidth: weeks * 24 }}
          onMouseLeave={() => setHover(null)}
        >
          <div
            className="grid h-[14px] text-micro leading-none text-muted"
            style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}
          >
            {months.map((m, i) => (
              <span key={i} className="overflow-visible whitespace-nowrap">
                {m}
              </span>
            ))}
          </div>
          <div
            className="mt-1 grid grid-flow-col grid-rows-7 gap-[3px]"
            style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}
          >
            {data.columns.flatMap((col, w) =>
              col.map((c, d) => (
                <span
                  key={`${w}-${d}`}
                  onMouseEnter={() => setHover({ w, d })}
                  className="aspect-square rounded-[3px] transition-[outline-color] duration-[var(--dur-fast)]"
                  style={{
                    background: c.future
                      ? "transparent"
                      : `var(--color-heat-${step(c.count, data.max)})`,
                    outline: hover?.w === w && hover?.d === d ? "1.5px solid var(--color-ink)" : "none",
                    outlineOffset: 1,
                  }}
                />
              )),
            )}
          </div>
          {cell && !cell.future ? (
            <Tip
              title={cell.date.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
              rows={[{ label: "Reels", value: String(cell.count) }]}
              style={{
                left: `${((hover!.w + 0.5) / weeks) * 100}%`,
                bottom: `calc(${((7 - hover!.d) / 7) * 100}% + 4px)`,
              }}
            />
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1.5 text-micro text-muted">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((s) => (
          <span key={s} className="h-2.5 w-2.5 rounded-[2px]" style={{ background: `var(--color-heat-${s})` }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
