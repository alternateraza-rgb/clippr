import { nicheById } from "@/lib/fixtures/niches";
import type { CaptionPreset, GameplayTrack, Niche, ScoreBreakdown } from "@/lib/agent/types";
import type { ReelRecord, StatsPayload } from "@/lib/stats/types";

/**
 * Everything the Stats pages draw, worked out from the raw reels in the
 * viewer's browser — so "Tuesday" means their Tuesday, not the server's.
 */

const DAY = 86_400_000;

/** yyyy-mm-dd in local time. The key every per-day map uses. */
export function dayKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Monday-first, which is how a working week reads. */
function startOfWeek(date: Date) {
  const day = startOfDay(date);
  const offset = (day.getDay() + 6) % 7;
  return new Date(day.getTime() - offset * DAY);
}

function mean(values: number[]) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export type Bucket = { label: string; value: number; hint?: string };

export type GenreRow = {
  genre: Niche;
  label: string;
  count: number;
  share: number;
  avgScore: number;
  avgSeconds: number;
  lastAt: string;
};

export const SUBSCORES: { key: keyof ScoreBreakdown; label: string }[] = [
  { key: "hook", label: "Hook" },
  { key: "emotion", label: "Emotion" },
  { key: "selfContained", label: "Stands alone" },
  { key: "quotability", label: "Quotable" },
  { key: "payoff", label: "Payoff" },
];

export const CAPTION_LABELS: Record<CaptionPreset, string> = {
  hormozi: "Hormozi",
  clean: "Clean",
  karaoke: "Karaoke",
};

export const GAMEPLAY_LABELS: Record<GameplayTrack, string> = {
  minecraft: "Minecraft",
  subway: "Subway Surfers",
  gta: "GTA",
  none: "No gameplay",
};

/** Reels that exist as a video. The rest are in flight or failed. */
export function finished(reels: ReelRecord[]) {
  return reels.filter((r) => r.status === "ready");
}

export function genreBreakdown(reels: ReelRecord[]): GenreRow[] {
  const sorted = reels.filter((r) => r.genre);
  const groups = new Map<Niche, ReelRecord[]>();
  for (const reel of sorted) {
    groups.set(reel.genre!, [...(groups.get(reel.genre!) ?? []), reel]);
  }
  return [...groups.entries()]
    .map(([genre, list]) => ({
      genre,
      label: nicheById(genre).label,
      count: list.length,
      share: list.length / sorted.length,
      avgScore: Math.round(mean(list.flatMap((r) => (r.score == null ? [] : [r.score])))),
      avgSeconds: mean(list.flatMap((r) => (r.durationS == null ? [] : [r.durationS]))),
      lastAt: list.reduce((a, r) => (r.createdAt > a ? r.createdAt : a), ""),
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/**
 * The genres that get a colour of their own: the user's top few, in rank order
 * over everything they have made. Fixed for the whole page, so a genre is the
 * same colour on every chart and doesn't repaint when a range changes.
 */
export const SERIES_SLOTS = 4;

export function genrePalette(rows: GenreRow[]) {
  const map = new Map<Niche, number>();
  rows.slice(0, SERIES_SLOTS).forEach((row, i) => map.set(row.genre, i + 1));
  return map;
}

/** Per-day counts for the last `weeks` weeks, Monday-aligned, oldest first. */
export function calendar(reels: ReelRecord[], weeks: number, now = new Date()) {
  const counts = new Map<string, number>();
  for (const reel of reels) {
    const key = dayKey(new Date(reel.createdAt));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const first = new Date(startOfWeek(now).getTime() - (weeks - 1) * 7 * DAY);
  const today = startOfDay(now).getTime();
  const columns: { date: Date; count: number; future: boolean }[][] = [];
  for (let w = 0; w < weeks; w++) {
    const column = [];
    for (let d = 0; d < 7; d++) {
      // Built from the calendar, not by adding 24h: a DST change would
      // otherwise land two cells on one date.
      const date = new Date(first.getFullYear(), first.getMonth(), first.getDate() + w * 7 + d);
      column.push({
        date,
        count: counts.get(dayKey(date)) ?? 0,
        future: date.getTime() > today,
      });
    }
    columns.push(column);
  }
  const max = Math.max(0, ...columns.flat().map((c) => c.count));
  return { columns, max };
}

/** Consecutive days with at least one reel, ending today (or yesterday). */
export function streaks(reels: ReelRecord[], now = new Date()) {
  const days = new Set(reels.map((r) => dayKey(new Date(r.createdAt))));
  const today = startOfDay(now);
  const dayAt = (offset: number) =>
    dayKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset));

  // A streak isn't broken until today is over.
  let offset = days.has(dayAt(0)) ? 0 : 1;
  let current = 0;
  while (days.has(dayAt(offset))) {
    current++;
    offset++;
  }

  const ordered = [...days].sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of ordered) {
    const [y, m, d] = key.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const next: Date | null = prev
      ? new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1)
      : null;
    run = next && dayKey(next) === key ? run + 1 : 1;
    best = Math.max(best, run);
    prev = date;
  }
  return { current, best };
}

export function weekly(reels: ReelRecord[], weeks: number, now = new Date()): Bucket[] {
  const thisWeek = startOfWeek(now);
  const out: Bucket[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(thisWeek.getFullYear(), thisWeek.getMonth(), thisWeek.getDate() - i * 7);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
    const value = reels.filter((r) => {
      const t = new Date(r.createdAt).getTime();
      return t >= start.getTime() && t < end.getTime();
    }).length;
    out.push({
      label: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value,
      hint: i === 0 ? "This week" : `Week of ${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    });
  }
  return out;
}

export function scoreHistogram(reels: ReelRecord[]): Bucket[] {
  const scores = reels.flatMap((r) => (r.score == null ? [] : [r.score]));
  // Scores below 40 are rare enough that splitting them hides the shape.
  const edges = [0, 40, 50, 60, 70, 80, 90, 101];
  return edges.slice(0, -1).map((lo, i) => {
    const hi = edges[i + 1];
    const label = lo === 0 ? "<40" : lo === 90 ? "90+" : `${lo}s`;
    return {
      label,
      value: scores.filter((s) => s >= lo && s < hi).length,
      hint: lo === 0 ? "Scored under 40" : lo === 90 ? "Scored 90 or more" : `Scored ${lo}–${hi - 1}`,
    };
  });
}

export function lengthHistogram(reels: ReelRecord[]): Bucket[] {
  const lengths = reels.flatMap((r) => (r.durationS == null ? [] : [r.durationS]));
  const edges = [0, 30, 40, 50, 60, 70, 80, Infinity];
  return edges.slice(0, -1).map((lo, i) => {
    const hi = edges[i + 1];
    const label = lo === 0 ? "<30s" : hi === Infinity ? "80s+" : `${lo}s`;
    return {
      label,
      value: lengths.filter((s) => s >= lo && s < hi).length,
      hint: lo === 0 ? "Under 30 seconds" : hi === Infinity ? "80 seconds or longer" : `${lo}–${hi} seconds`,
    };
  });
}

export function subscoreAverages(reels: ReelRecord[]) {
  const scored = reels.filter((r) => r.scores);
  return SUBSCORES.map(({ key, label }) => ({
    key,
    label,
    value: Math.round(mean(scored.map((r) => Number(r.scores![key]) || 0))),
  }));
}

export function tally<T extends string>(values: (T | null)[]) {
  const counts = new Map<T, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export function summarize(payload: StatsPayload, now = new Date()) {
  const ready = finished(payload.reels);
  const scores = ready.flatMap((r) => (r.score == null ? [] : [r.score]));
  const seconds = ready.reduce((sum, r) => sum + (r.durationS ?? 0), 0);
  const sources = new Set(ready.map((r) => r.videoId));
  const sourceSeconds = [...sources].reduce(
    (sum, id) => sum + (payload.videos[id]?.durationS ?? 0),
    0,
  );

  const channels = tally(
    ready.map((r) => payload.videos[r.videoId]?.channel ?? null),
  ).slice(0, 5);

  const failed = payload.reels.filter((r) => r.status === "failed").length;
  const settled = ready.length + failed;
  const renderTimes = ready.flatMap((r) =>
    r.finishedAt
      ? [Math.max(0, (new Date(r.finishedAt).getTime() - new Date(r.createdAt).getTime()) / 1000)]
      : [],
  );
  const asr = ready.filter((r) => r.asrSource);

  const stitched = ready.filter((r) => r.roles.length > 1).length;

  return {
    ready,
    totals: {
      reels: ready.length,
      seconds,
      sources: sources.size,
      sourceSeconds,
      avgScore: Math.round(mean(scores)),
    },
    streak: streaks(ready, now),
    genres: genreBreakdown(ready),
    best: [...ready]
      .filter((r) => r.score != null)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 3),
    channels,
    shape: {
      single: ready.length - stitched,
      stitched,
      avgSeconds: ready.length ? seconds / ready.length : 0,
    },
    health: {
      successRate: settled ? ready.length / settled : 0,
      failed,
      medianRenderS: median(renderTimes),
      whisperShare: asr.length ? asr.filter((r) => r.asrSource === "whisper").length / asr.length : 0,
    },
  };
}

export type Summary = ReturnType<typeof summarize>;

/** Month-by-month counts per genre, for the genre mix chart. */
export function genreTimeline(reels: ReelRecord[], months: number, now = new Date()) {
  const out: { label: string; hint: string; counts: Map<Niche, number>; total: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const counts = new Map<Niche, number>();
    let total = 0;
    for (const reel of reels) {
      if (!reel.genre) continue;
      const t = new Date(reel.createdAt).getTime();
      if (t < start.getTime() || t >= end.getTime()) continue;
      counts.set(reel.genre, (counts.get(reel.genre) ?? 0) + 1);
      total++;
    }
    out.push({
      label: start.toLocaleDateString("en-US", { month: "short" }),
      hint: start.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      counts,
      total,
    });
  }
  return out;
}

/** Slot n of the categorical palette, or the "other" grey past the last slot. */
export function seriesColor(slot: number | undefined) {
  return slot && slot <= SERIES_SLOTS ? `var(--color-series-${slot})` : "var(--color-series-other)";
}

/**
 * A length said the way a person would — "54s", "51 min", "32h 6m". The
 * player-style "50:37" in lib/format reads as a time of day out of context.
 */
export function spokenDuration(seconds: number) {
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  if (s < 3600) {
    const m = Math.floor(s / 60);
    const rest = s % 60;
    return m < 10 && rest ? `${m}m ${rest}s` : `${Math.round(s / 60)} min`;
  }
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}
