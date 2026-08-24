import { findPhrase, tightenRange } from "@/lib/agent/snap";
import { pickOffset } from "@/lib/agent/time";
import type { StorySegment, WordTiming } from "@/lib/agent/types";

/** Below this a segment is a jump cut, not a beat. */
const MIN_SEGMENT_S = 5;
/** A gap the viewer cannot perceive is a wasted seam — merge across it. */
const MERGE_GAP_S = 1.5;
export const TARGET_MIN_S = 50;
export const TARGET_MAX_S = 60;
/** Overshoot worth living with rather than dropping a whole beat. */
const DROP_TOLERANCE_S = 4;

const ROLES = new Set(["setup", "beat", "turn", "payoff"]);

function role(value: unknown): StorySegment["role"] {
  const text = String(value ?? "").toLowerCase();
  return ROLES.has(text) ? (text as StorySegment["role"]) : "beat";
}

export function totalDuration(segments: StorySegment[]) {
  return segments.reduce((sum, s) => sum + (s.end - s.start), 0);
}

type Draft = StorySegment & { wanted: number };

/**
 * Turns whatever the model returned into spans that actually exist on the tape,
 * in an order that can be played.
 *
 * The model is good at choosing moments and bad at timing them: it will ask for
 * a 78-second "setup" inside a 60-second clip. Its timestamps are treated as a
 * suggestion, its quotes as the truth, and the length of each beat is budgeted
 * here rather than taken on faith.
 */
export function buildSegments(raw: unknown, words: WordTiming[]): StorySegment[] {
  const rows = (Array.isArray(raw) ? raw : []).filter(
    (row): row is Record<string, unknown> => Boolean(row) && typeof row === "object",
  );
  if (!rows.length) return [];

  // Every beat gets an equal share of the clip, so four moments become four
  // 15-second beats instead of two 30-second ones with the rest discarded.
  const budget = Math.max(MIN_SEGMENT_S, TARGET_MAX_S / rows.length);

  const drafts: Draft[] = [];
  for (const record of rows) {
    const startRaw = pickOffset(record, ["start", "start_s", "startSec", "from"]);
    const endRaw = pickOffset(record, ["end", "end_s", "endSec", "to"]);
    if (startRaw == null || endRaw == null) continue;

    const quote = String(record.quote ?? record.text ?? "").slice(0, 220);
    const at = findPhrase(words, quote, startRaw);
    const from = at >= 0 ? words[at].start : startRaw;
    const asked = endRaw - startRaw || budget;
    const wanted = Math.min(asked, budget);

    const tight = tightenRange(words, from, from + wanted, { minDuration: MIN_SEGMENT_S });
    if (tight.end - tight.start < MIN_SEGMENT_S) continue;

    drafts.push({
      start: Math.max(0, tight.start),
      end: tight.end,
      quote,
      role: role(record.role),
      wanted: asked,
    });
  }

  if (!drafts.length) return [];

  // Chronological and non-overlapping. Two quotes can anchor onto the same
  // line, and a clip that plays a sentence twice is worse than a shorter one.
  drafts.sort((a, b) => a.start - b.start);
  const ordered: Draft[] = [];
  for (const draft of drafts) {
    const previous = ordered[ordered.length - 1];
    if (previous && draft.start < previous.end + MERGE_GAP_S) {
      previous.end = Math.max(previous.end, draft.end);
      continue;
    }
    ordered.push(draft);
  }

  return fit(ordered, words).map(({ start, end, quote, role: segmentRole }) => ({
    start,
    end,
    quote,
    role: segmentRole,
  }));
}

/**
 * Lands the total inside 50–60s.
 *
 * Dropping is the last resort and never touches the first or last segment: the
 * opening and the payoff are the two things a clip cannot do without. An
 * earlier version popped from the end, which threw the payoff away every time.
 */
function fit(segments: Draft[], words: WordTiming[]): Draft[] {
  let result = segments.map((s) => ({ ...s }));

  // Too short: give length back to the beats that asked for more.
  for (let guard = 0; guard < 12 && totalDuration(result) < TARGET_MIN_S; guard++) {
    const headroom = TARGET_MAX_S - totalDuration(result);
    const candidate = result.find((s) => s.wanted > s.end - s.start + 1);
    if (!candidate) break;
    const want = Math.min(candidate.wanted, candidate.end - candidate.start + headroom);
    const tight = tightenRange(words, candidate.start, candidate.start + want, {
      minDuration: MIN_SEGMENT_S,
    });
    if (tight.end <= candidate.end) {
      // This one cannot grow any further; stop asking it.
      candidate.wanted = candidate.end - candidate.start;
      continue;
    }
    candidate.end = tight.end;
  }

  // Too long: shorten the longest, preferring a sentence boundary but falling
  // back to a plain trim. Refusing to trim without a boundary is how a
  // 0.4-second overage used to cost a 17-second beat.
  for (let guard = 0; guard < 12 && totalDuration(result) > TARGET_MAX_S; guard++) {
    const excess = totalDuration(result) - TARGET_MAX_S;
    const longest = result.reduce((a, b) => (b.end - b.start > a.end - a.start ? b : a));
    const want = Math.max(MIN_SEGMENT_S, longest.end - longest.start - excess);
    const tight = tightenRange(words, longest.start, longest.start + want, {
      minDuration: MIN_SEGMENT_S,
    });
    longest.end =
      tight.end < longest.end
        ? tight.end
        : Math.max(longest.start + MIN_SEGMENT_S, longest.end - excess);
  }

  // Still long by a real margin: drop middles, fattest first. The tolerance
  // matters — a couple of seconds over is a clip, losing a beat is a worse one.
  while (totalDuration(result) > TARGET_MAX_S + DROP_TOLERANCE_S && result.length > 2) {
    const middles = result.slice(1, -1);
    const fattest = middles.reduce((a, b) => (b.end - b.start > a.end - a.start ? b : a));
    result = result.filter((s) => s !== fattest);
  }

  return result;
}
