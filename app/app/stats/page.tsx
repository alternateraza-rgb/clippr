"use client";

import { useMemo } from "react";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { StatTile } from "@/components/app/StatTile";
import { CountUp } from "@/components/motion/CountUp";
import { BarList } from "@/components/stats/BarList";
import { ChartCard } from "@/components/stats/ChartCard";
import { Columns } from "@/components/stats/Columns";
import { Heatmap } from "@/components/stats/Heatmap";
import { SortingNote } from "@/components/stats/SortingNote";
import { SplitBar, type Part } from "@/components/stats/SplitBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pill } from "@/components/ui/Pill";
import { Skeleton } from "@/components/ui/Skeleton";
import { useReelStats } from "@/lib/hooks/useReelStats";
import {
  calendar,
  CAPTION_LABELS,
  GAMEPLAY_LABELS,
  genrePalette,
  lengthHistogram,
  scoreHistogram,
  seriesColor,
  spokenDuration,
  subscoreAverages,
  summarize,
  tally,
  weekly,
} from "@/lib/stats/compute";
import type { CaptionPreset, GameplayTrack } from "@/lib/agent/types";
import type { StatsPayload } from "@/lib/stats/types";

const WEEKS_ON_CALENDAR = 26;

export default function StatsPage() {
  const { data, loading, sorting } = useReelStats();

  return (
    <div>
      <PageHeader
        eyebrow="Stats"
        title="Everything you've cut, counted"
        lede="What you make, how often, and what it's about. Updated every time a reel finishes."
        action={<SortingNote sorting={sorting} unsorted={data.unsorted} />}
      />
      {loading ? <StatsSkeleton /> : <StatsBody data={data} sorting={sorting} />}
    </div>
  );
}

function StatsBody({ data, sorting }: { data: StatsPayload; sorting: boolean }) {
  const s = useMemo(() => summarize(data), [data]);
  const cal = useMemo(() => calendar(s.ready, WEEKS_ON_CALENDAR), [s.ready]);
  const weeks = useMemo(() => weekly(s.ready, 12), [s.ready]);
  const scores = useMemo(() => scoreHistogram(s.ready), [s.ready]);
  const lengths = useMemo(() => lengthHistogram(s.ready), [s.ready]);
  const subs = useMemo(() => subscoreAverages(s.ready), [s.ready]);
  const palette = useMemo(() => genrePalette(s.genres), [s.genres]);

  if (!s.totals.reels) {
    return (
      <EmptyState
        className="mt-12"
        icon={BarChart3}
        title="No reels to count yet"
        body="Stats fill in as you make reels — how many, how good, and what they're about. Your first one takes a couple of minutes."
        action={<Pill href="/app/studio">Open Studio</Pill>}
      />
    );
  }

  const minutes = s.totals.seconds / 60;
  const top = s.genres[0];
  const strongest = [...subs].sort((a, b) => b.value - a.value)[0];
  const weakest = [...subs].sort((a, b) => a.value - b.value)[0];

  const captionParts: Part[] = tally(s.ready.map((r) => r.captionPreset)).map(([key, value], i) => ({
    key,
    label: CAPTION_LABELS[key as CaptionPreset] ?? key,
    value,
    color: seriesColor(i < 4 ? i + 1 : undefined),
  }));
  const gameplayParts: Part[] = tally(s.ready.map((r) => r.gameplay)).map(([key, value], i) => ({
    key,
    label: GAMEPLAY_LABELS[key as GameplayTrack] ?? key,
    value,
    color: key === "none" ? "var(--color-series-other)" : seriesColor(i < 4 ? i + 1 : undefined),
  }));

  return (
    <div className="mt-9 flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card bg-hairline shadow-hairline lg:grid-cols-4">
        <StatTile
          value={<CountUp to={s.totals.reels} group={false} />}
          label="Reels made"
          hint={s.streak.current > 1 ? `${s.streak.current}-day streak going` : "Finished and downloadable"}
        />
        <StatTile
          value={minutes >= 60 ? <CountUp to={minutes / 60} decimals={1} suffix="h" /> : <CountUp to={Math.round(minutes)} suffix=" min" />}
          label="Of finished video"
          hint={`About ${spokenDuration(s.shape.avgSeconds)} per reel`}
        />
        <StatTile
          value={<CountUp to={s.totals.sources} group={false} />}
          label="Videos mined"
          hint={
            s.totals.sourceSeconds
              ? `${spokenDuration(s.totals.sourceSeconds)} of source`
              : "Longform videos you cut from"
          }
        />
        <StatTile
          value={<CountUp to={s.totals.avgScore} group={false} />}
          label="Average score"
          hint="Out of 100, as scored when cut"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="When you make reels"
          caption={
            s.streak.best > 1
              ? `Longest streak: ${s.streak.best} days in a row${s.streak.current ? ` · current: ${s.streak.current}` : ""}`
              : "The last six months, one square a day"
          }
        >
          <Heatmap data={cal} />
        </ChartCard>

        <ChartCard
          title="Most used genre"
          caption={top ? `${Math.round(top.share * 100)}% of your reels` : undefined}
          action={s.genres.length ? { href: "/app/stats/genres", label: "All genres" } : undefined}
        >
          {top ? (
            <>
              <p className="display text-d3 text-ink">{top.label}</p>
              <p className="mt-1 text-sm text-muted">
                {top.count} reel{top.count === 1 ? "" : "s"} · avg score {top.avgScore}
              </p>
              <BarList
                className="mt-5"
                rows={s.genres.slice(0, 5).map((g) => ({
                  key: g.genre,
                  label: g.label,
                  value: g.count,
                  color: seriesColor(palette.get(g.genre)),
                  href: `/app/stats/genres#${g.genre}`,
                }))}
              />
            </>
          ) : (
            <p className="text-sm text-body">
              {sorting
                ? "Working out what each of your reels is about…"
                : "Genres show up here once your reels have been sorted."}
            </p>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Reels per week"
          caption="The last 12 weeks, this one on the right"
        >
          <Columns data={weeks} unit="reel" caption="Reels per week, last 12 weeks" />
        </ChartCard>

        <ChartCard title="Your best reels" caption="Highest scored" action={{ href: "/app/library", label: "Library" }}>
          <ol className="flex flex-col gap-3">
            {s.best.map((reel, i) => (
              <li key={reel.id}>
                <Link
                  href="/app/library"
                  className="group -mx-2 flex items-center gap-3 rounded-control px-2 py-1.5 transition-colors hover:bg-surface-warm"
                >
                  <div className="relative h-14 w-[42px] shrink-0 overflow-hidden rounded-[6px] bg-surface-warm-alt">
                    {data.posters[reel.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element -- signed, short-lived URL
                      <img src={data.posters[reel.id]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="tnum absolute inset-0 flex items-center justify-center text-caption text-muted">
                        {i + 1}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm text-ink">{reel.topic || reel.hook || "Untitled reel"}</p>
                    <p className="mt-0.5 truncate text-caption text-muted">
                      {data.videos[reel.videoId]?.channel ?? "Unknown channel"}
                    </p>
                  </div>
                  <span className="display tnum text-d1 text-ink">{reel.score}</span>
                </Link>
              </li>
            ))}
          </ol>
        </ChartCard>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <ChartCard title="Scores" caption={`Most of your reels land in the ${peakLabel(scores)}`}>
          <Columns data={scores} unit="reel" height={140} caption="Reels by score" />
        </ChartCard>

        <ChartCard
          title="What your clips do well"
          caption={
            strongest && weakest && strongest.key !== weakest.key
              ? `Strongest on ${strongest.label.toLowerCase()}, weakest on ${weakest.label.toLowerCase()}`
              : "Average of each score, out of 100"
          }
        >
          <BarList
            max={100}
            rows={subs.map((sub) => ({
              key: sub.key,
              label: sub.label,
              value: sub.value,
              color: sub.key === weakest?.key ? "var(--color-series-other)" : undefined,
            }))}
          />
        </ChartCard>

        <ChartCard
          title="Length"
          caption={`${s.shape.stitched} of ${s.totals.reels} stitched from several moments`}
          className="md:col-span-2 lg:col-span-1"
        >
          <Columns data={lengths} unit="reel" height={140} caption="Reels by length" />
        </ChartCard>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <ChartCard title="Caption style">
          <SplitBar parts={captionParts} caption="Reels by caption style" />
        </ChartCard>
        <ChartCard title="Gameplay">
          <SplitBar parts={gameplayParts} caption="Reels by gameplay track" />
        </ChartCard>
        <ChartCard
          title="Channels you clip"
          caption={
            s.totals.sourceSeconds
              ? `${spokenDuration(s.totals.sourceSeconds)} of video, cut to ${spokenDuration(s.totals.seconds)}`
              : undefined
          }
          className="md:col-span-2 lg:col-span-1"
        >
          {s.channels.length ? (
            <BarList
              rows={s.channels.map(([channel, count]) => ({
                key: channel,
                label: channel,
                value: count,
                color: "var(--color-series-2)",
              }))}
            />
          ) : (
            <p className="text-sm text-body">Channel names appear once a source video has been looked up.</p>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card bg-hairline shadow-hairline md:grid-cols-4">
        <SmallFigure value={`${Math.round(s.health.successRate * 100)}%`} label="Renders that finished" />
        <SmallFigure
          value={s.health.medianRenderS ? spokenDuration(s.health.medianRenderS) : "—"}
          label="Typical render time"
        />
        <SmallFigure value={`${Math.round(s.health.whisperShare * 100)}%`} label="Transcribed by Whisper" />
        <SmallFigure value={String(s.health.failed)} label="Didn't finish" />
      </div>
    </div>
  );
}

function peakLabel(buckets: { label: string; value: number; hint?: string }[]) {
  const peak = [...buckets].sort((a, b) => b.value - a.value)[0];
  if (!peak?.value) return "middle";
  return peak.label === "90+" ? "90s" : peak.label === "<40" ? "under 40s" : peak.label;
}

function SmallFigure({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-surface px-5 py-4">
      <p className="tnum text-lg font-medium text-ink">{value}</p>
      <p className="text-caption text-muted">{label}</p>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="mt-9 flex flex-col gap-5">
      <Skeleton className="h-[116px] rounded-card" />
      <div className="grid gap-5 lg:grid-cols-3">
        <Skeleton className="h-[260px] rounded-card lg:col-span-2" />
        <Skeleton className="h-[260px] rounded-card" />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Skeleton className="h-[260px] rounded-card lg:col-span-2" />
        <Skeleton className="h-[260px] rounded-card" />
      </div>
    </div>
  );
}
