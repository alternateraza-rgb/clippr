"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Shapes } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { BarList } from "@/components/stats/BarList";
import { ChartCard } from "@/components/stats/ChartCard";
import { SortingNote } from "@/components/stats/SortingNote";
import { StackedColumns, type Series } from "@/components/stats/StackedColumns";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pill } from "@/components/ui/Pill";
import { Skeleton } from "@/components/ui/Skeleton";
import { NICHES } from "@/lib/fixtures/niches";
import { formatRelativeDate } from "@/lib/format";
import { useReelStats } from "@/lib/hooks/useReelStats";
import {
  finished,
  genreBreakdown,
  genrePalette,
  genreTimeline,
  SERIES_SLOTS,
  seriesColor,
  spokenDuration,
} from "@/lib/stats/compute";
import type { StatsPayload } from "@/lib/stats/types";

const MONTHS = 6;

export default function GenresPage() {
  const { data, loading, sorting } = useReelStats();

  return (
    <div>
      <Link
        href="/app/stats"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-body transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Stats
      </Link>
      <PageHeader
        eyebrow="Genres"
        title="What your reels are about"
        lede="Every reel is sorted into one genre by what the clip itself covers — not the channel it came from."
        action={<SortingNote sorting={sorting} unsorted={data.unsorted} />}
      />
      {loading ? (
        <div className="mt-9 flex flex-col gap-5">
          <Skeleton className="h-[320px] rounded-card" />
          <Skeleton className="h-[420px] rounded-card" />
        </div>
      ) : (
        <GenresBody data={data} sorting={sorting} />
      )}
    </div>
  );
}

function GenresBody({ data, sorting }: { data: StatsPayload; sorting: boolean }) {
  const ready = useMemo(() => finished(data.reels), [data.reels]);
  const genres = useMemo(() => genreBreakdown(ready), [ready]);
  const palette = useMemo(() => genrePalette(genres), [genres]);
  const timeline = useMemo(() => genreTimeline(ready, MONTHS), [ready]);

  if (!genres.length) {
    return (
      <EmptyState
        className="mt-12"
        icon={Shapes}
        title={sorting ? "Sorting your reels" : "No genres yet"}
        body={
          sorting
            ? "Working out what each reel is about. This page fills in on its own."
            : "Make a reel and it'll be sorted into a genre the moment it's scored."
        }
        action={sorting ? undefined : <Pill href="/app/studio">Open Studio</Pill>}
      />
    );
  }

  // The top genres keep their own colour; everything after them folds into
  // one grey "other" rather than inventing a ninth hue.
  const named = genres.slice(0, SERIES_SLOTS);
  const series: Series[] = [
    ...named.map((g) => ({ key: g.genre, label: g.label, color: seriesColor(palette.get(g.genre)) })),
    ...(genres.length > SERIES_SLOTS
      ? [{ key: "other", label: "Other", color: "var(--color-series-other)" }]
      : []),
  ];
  const stacks = timeline.map((month) => {
    const values: Record<string, number> = {};
    let other = 0;
    for (const [genre, n] of month.counts) {
      if (palette.has(genre)) values[genre] = n;
      else other += n;
    }
    if (other) values.other = other;
    return { label: month.label, hint: month.hint, values };
  });

  const total = genres.reduce((s, g) => s + g.count, 0);
  const tried = new Set(genres.map((g) => g.genre));
  const untried = NICHES.filter((n) => !tried.has(n.id));
  const bestScoring = [...genres].filter((g) => g.count >= 2).sort((a, b) => b.avgScore - a.avgScore)[0];

  return (
    <div className="mt-9 flex flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Genre mix over time"
          caption={`Reels per month, last ${MONTHS} months`}
        >
          <StackedColumns series={series} data={stacks} caption="Reels per month by genre" />
        </ChartCard>

        <ChartCard
          title="Score by genre"
          caption={
            bestScoring
              ? `${bestScoring.label} scores best, averaging ${bestScoring.avgScore}`
              : "Average score, out of 100"
          }
        >
          <BarList
            max={100}
            rows={[...genres].sort((a, b) => b.avgScore - a.avgScore).map((g) => ({
              key: g.genre,
              label: g.label,
              value: g.avgScore,
              color: seriesColor(palette.get(g.genre)),
            }))}
          />
        </ChartCard>
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className="flex items-baseline justify-between gap-4 px-5 pb-3 pt-5 md:px-6">
          <h2 className="text-base font-semibold text-ink">Every genre you&apos;ve made</h2>
          <p className="tnum text-sm text-muted">
            {total} reel{total === 1 ? "" : "s"} across {genres.length}
          </p>
        </div>
        <ul className="divide-y divide-hairline border-t border-hairline">
          {genres.map((g, i) => (
            <li key={g.genre} id={g.genre} className="scroll-mt-24 target:bg-brand-soft">
              <Link
                href={`/app/library?genre=${g.genre}`}
                className="group grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-surface-warm md:grid-cols-[28px_minmax(0,1.4fr)_minmax(0,2fr)_repeat(3,72px)_auto] md:px-6"
              >
                <span className="tnum text-sm text-muted">{i + 1}</span>
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                    style={{ background: seriesColor(palette.get(g.genre)) }}
                  />
                  <span className="truncate text-base font-medium text-ink">{g.label}</span>
                </span>
                <ArrowRight
                  className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink md:order-last"
                  strokeWidth={2}
                />
                <span className="col-span-3 flex items-center gap-3 md:col-span-1">
                  <span className="h-2 flex-1 rounded-full bg-surface-warm">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        // Against the top genre, so the ranking reads at a glance.
                        width: `max(${(g.count / genres[0].count) * 100}%, 6px)`,
                        background: seriesColor(palette.get(g.genre)),
                      }}
                    />
                  </span>
                  <span className="tnum w-20 text-right text-sm text-ink">
                    {g.count} · {Math.round(g.share * 100)}%
                  </span>
                </span>
                <Figure className="col-span-1" label="avg score" value={String(g.avgScore)} />
                <Figure label="avg length" value={g.avgSeconds ? spokenDuration(g.avgSeconds) : "—"} />
                <Figure label="last made" value={formatRelativeDate(g.lastAt)} />
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      {untried.length ? (
        <ChartCard
          title="Genres you haven't tried"
          caption="Each one rated for how much room there is to grow in it"
          action={{ href: "/app/ideas", label: "Find ideas" }}
        >
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {untried
              .sort((a, b) => b.opportunity - a.opportunity)
              .map((n) => (
                <li key={n.id} className="rounded-card-inner bg-surface-warm px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium text-ink">{n.label}</p>
                    <p className="tnum text-caption text-muted">opportunity {n.opportunity}</p>
                  </div>
                  <p className="mt-1 text-caption text-body">{n.blurb}</p>
                </li>
              ))}
          </ul>
        </ChartCard>
      ) : null}
    </div>
  );
}

function Figure({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <span className={className}>
      <span className="tnum block text-sm text-ink">{value}</span>
      <span className="block text-micro text-muted">{label}</span>
    </span>
  );
}
