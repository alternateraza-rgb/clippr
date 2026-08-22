import type { CaptionLine, WordTiming } from "@/lib/agent/types";

export type Interval = [number, number];

export type JumpCutPlan = {
  /** Segments of the original clip timeline to keep, in order. */
  keep: Interval[];
  /** Gaps removed from the original timeline, in order. */
  removed: Interval[];
};

/**
 * Finds dead air between words (and before the first / after the last word)
 * longer than `gapThreshold` and marks it for removal, leaving a small `pad`
 * on either side so the cut doesn't feel abrupt.
 */
export function planJumpCuts(
  words: WordTiming[],
  duration: number,
  opts?: { gapThreshold?: number; pad?: number },
): JumpCutPlan {
  const gapThreshold = opts?.gapThreshold ?? 0.6;
  const pad = opts?.pad ?? 0.12;
  if (!words.length || duration <= 0) return { keep: [[0, Math.max(duration, 0)]], removed: [] };

  const sorted = [...words].sort((a, b) => a.start - b.start);
  const removed: Interval[] = [];

  const leadGap = sorted[0].start;
  if (leadGap - pad >= gapThreshold) removed.push([0, leadGap - pad]);

  for (let i = 0; i < sorted.length - 1; i++) {
    const gapStart = sorted[i].end;
    const gapEnd = sorted[i + 1].start;
    const gap = gapEnd - gapStart;
    if (gap >= gapThreshold + pad * 2) {
      removed.push([gapStart + pad, gapEnd - pad]);
    }
  }

  const lastEnd = sorted[sorted.length - 1].end;
  const trailGap = duration - lastEnd;
  if (trailGap - pad >= gapThreshold) removed.push([lastEnd + pad, duration]);

  const keep: Interval[] = [];
  let cursor = 0;
  for (const [rs, re] of removed) {
    if (rs > cursor) keep.push([cursor, rs]);
    cursor = re;
  }
  if (cursor < duration) keep.push([cursor, duration]);

  // Never cut everything, and never leave a keep-list so fragmented that the
  // edit reads as stroboscopic — require at least a token amount kept.
  const kept = keep.reduce((a, [s, e]) => a + (e - s), 0);
  if (!keep.length || kept < Math.min(4, duration * 0.3)) {
    return { keep: [[0, duration]], removed: [] };
  }

  return { keep, removed };
}

function cutBefore(t: number, removed: Interval[]): number {
  let total = 0;
  for (const [rs, re] of removed) {
    if (re <= t) total += re - rs;
    else if (rs < t) total += t - rs;
  }
  return total;
}

/** Maps a timestamp on the original timeline onto the post-jump-cut timeline. */
export function mapTime(t: number, removed: Interval[]): number {
  return Math.max(0, t - cutBefore(t, removed));
}

/** Shifts caption line/word timestamps to match the shortened, jump-cut timeline. */
export function remapCaptionLines(lines: CaptionLine[], removed: Interval[]): CaptionLine[] {
  if (!removed.length) return lines;
  return lines.map((line) => ({
    start: mapTime(line.start, removed),
    end: mapTime(line.end, removed),
    words: line.words.map((w) => ({
      text: w.text,
      start: mapTime(w.start, removed),
      end: mapTime(w.end, removed),
    })),
  }));
}

/** Total duration once the removed spans are cut out. */
export function jumpCutDuration(duration: number, removed: Interval[]): number {
  const cut = removed.reduce((a, [s, e]) => a + (e - s), 0);
  return Math.max(0, duration - cut);
}
