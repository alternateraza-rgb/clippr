import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

/**
 * Every chart sits in the same frame: what it is, one line on how to read it,
 * and at most one way out. The chart is the only loud thing in the card.
 */
export function ChartCard({
  title,
  caption,
  action,
  children,
  className,
}: {
  title: string;
  caption?: React.ReactNode;
  action?: { href: string; label: string };
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card padding="none" className={cn("flex min-w-0 flex-col p-5 md:p-6", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          {caption ? (
            <p className="mt-0.5 text-sm text-muted">{caption}</p>
          ) : null}
        </div>
        {action ? (
          <Link
            href={action.href}
            className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-body transition-colors hover:text-ink"
          >
            {action.label}
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform duration-[var(--dur-fast)] group-hover:translate-x-0.5"
              strokeWidth={2}
            />
          </Link>
        ) : null}
      </div>
      <div className="mt-5 flex-1">{children}</div>
    </Card>
  );
}

/**
 * The hover readout, centred on `left` and sitting above `bottom`. Text stays
 * in ink; the swatch beside it carries identity.
 */
export function Tip({
  title,
  rows,
  style,
}: {
  title: string;
  rows: { label: string; value: string; color?: string }[];
  style?: React.CSSProperties;
}) {
  return (
    <div
      role="status"
      style={style}
      className="pointer-events-none absolute z-10 min-w-[132px] -translate-x-1/2 whitespace-nowrap rounded-control bg-ink px-3 py-2 text-caption text-on-brand shadow-pop"
    >
      <p className="font-medium">{title}</p>
      {rows.map((row) => (
        <p
          key={row.label}
          className="mt-0.5 flex items-center gap-2 text-on-brand/75"
        >
          {row.color ? (
            <span
              className="h-2 w-2 shrink-0 rounded-[2px]"
              style={{ background: row.color }}
            />
          ) : null}
          <span className="flex-1">{row.label}</span>
          <span className="tnum font-medium text-on-brand">{row.value}</span>
        </p>
      ))}
    </div>
  );
}

/** The same numbers as the chart, for screen readers. */
export function DataTable({
  caption,
  head,
  rows,
}: {
  caption: string;
  head: string[];
  rows: (string | number)[][];
}) {
  // The wrapper does the hiding: a table ignores the 1px width sr-only sets
  // and grows to fit its cells, which widened the page on a phone.
  return (
    <div className="sr-only">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) =>
                j === 0 ? (
                  <th key={j} scope="row">
                    {cell}
                  </th>
                ) : (
                  <td key={j}>{cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
