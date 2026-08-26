import type { Interval } from "@/lib/agent/jumpcuts";
import type { WordTiming } from "@/lib/agent/types";

export type Sentence = { start: number; end: number; text: string };

/**
 * Padding exists so a sentence can finish, not so the clip can grow. These
 * windows are deliberately tight: a looser version let an end travel twelve
 * seconds and a start move backwards, and segments simply swallowed their whole
 * padded window — importing speech the model never chose and pushing a 60s clip
 * to 72s.
 */
const LOOK_FORWARD_S = 6;
const LOOK_BACK_S = 4;
/** The start may creep forward, or a hair back onto its own first word. */
const START_FORWARD_S = 3;
const START_BACK_S = 1;
/**
 * A finished sentence is followed by a breath. Whisper punctuates its own
 * segment boundaries even where it split mid-thought, so punctuation alone
 * accepts ends like "they are quite literally some of them" — requiring a real
 * pause as well rejects those.
 */
const PAUSE_S = 0.2;

function finished(token: string) {
  return /[.!?]["')\]]?$/.test(token.trim());
}

function bare(token: string) {
  return token.toLowerCase().replace(/[^a-z0-9']/g, "");
}

/**
 * Timestamps where sentences actually end.
 *
 * Whisper's segment boundaries cannot be trusted for this: depending on the
 * audio it will happily emit chunks like "mountains. And at first, to be
 * honest, no one was really tha…", which both begins and ends mid-sentence.
 * The punctuation is real, it is just *inside* the text — so the sentence ends
 * are found by walking the punctuated text and mapping each terminator onto the
 * matching word's timestamp.
 */
export function sentenceEnds(sentences: Sentence[], words: WordTiming[]): number[] {
  const ends: number[] = [];

  // Scoped per segment on purpose. One cursor walked across the whole
  // transcript drifts — Whisper tokenises things like "20-something"
  // differently in its text than in its word list — and a drifted cursor puts a
  // full stop on the wrong word, which reads as a clip trailing off mid-clause.
  // Confining the search to each segment's own time range bounds the damage.
  for (const sentence of sentences) {
    const inside = words.filter(
      (w) => w.end > sentence.start - 0.3 && w.start < sentence.end + 0.3,
    );
    if (!inside.length) continue;

    const tokens = sentence.text.trim().split(/\s+/).filter(Boolean);
    let cursor = 0;
    for (const token of tokens) {
      if (cursor >= inside.length) break;
      if (bare(inside[cursor].text) !== bare(token)) {
        const ahead = inside
          .slice(cursor, cursor + 4)
          .findIndex((w) => bare(w.text) === bare(token));
        if (ahead > 0) cursor += ahead;
      }
      if (finished(token)) ends.push(inside[cursor].end);
      cursor += 1;
    }
  }

  return [...new Set(ends)].sort((a, b) => a - b);
}

export function snapToSentences(
  sentences: Sentence[],
  span: Interval,
  words: WordTiming[] = [],
): Interval {
  const [wantStart, wantEnd] = span;
  if (!sentences.length || !words.length) return span;

  const ends = sentenceEnds(sentences, words);
  if (!ends.length) return span;

  /** Silence between this moment and the next word spoken after it. */
  const pauseAfter = (at: number) => {
    const next = words.find((w) => w.start >= at - 0.01);
    return next ? next.start - at : Number.POSITIVE_INFINITY;
  };

  // A sentence starts on the word after one ends, so the same list gives both
  // edges. Starting later is fine; starting earlier imports speech from before
  // the moment the model picked.
  const startsAfter = ends
    .map((end) => words.find((w) => w.start >= end - 0.01)?.start)
    .filter((t): t is number => t != null);
  const starts = startsAfter.filter(
    (t) => t >= wantStart - START_BACK_S && t <= wantStart + START_FORWARD_S,
  );
  const start = starts.length
    ? starts.reduce((a, b) => (Math.abs(b - wantStart) < Math.abs(a - wantStart) ? b : a))
    : wantStart;

  // End: the nearest real sentence end, within a tight window either side of
  // where the model wanted to stop, and followed by an actual breath.
  const candidates = ends.filter(
    (t) =>
      t > start + 1 &&
      t >= wantEnd - LOOK_BACK_S &&
      t <= wantEnd + LOOK_FORWARD_S &&
      pauseAfter(t) >= PAUSE_S,
  );
  const end = candidates.length
    ? candidates.reduce((a, b) => (Math.abs(b - wantEnd) < Math.abs(a - wantEnd) ? b : a))
    : wantEnd;

  if (end <= start + 1) return span;
  return [start, end];
}
