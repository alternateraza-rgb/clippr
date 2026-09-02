import { findPhrase, findPhraseSpan } from "@/lib/agent/snap";
import { pickOffset } from "@/lib/agent/time";
import type { StorySegment, WordTiming } from "@/lib/agent/types";

/** Below this a segment is a jump cut, not a beat. */
const MIN_SEGMENT_S = 5;
/**
 * Beyond this the quote almost certainly matched the wrong occurrence. Set
 * generously: rejecting a correctly-quoted 31-second span sends it back to the
 * clock-based fallback, which is the mid-sentence cut this file exists to
 * prevent. Length is controlled by asking the model again, not by truncating.
 */
const MAX_SEGMENT_S = 34;
/** A gap the viewer cannot perceive is a wasted seam — merge across it. */
const MERGE_GAP_S = 1.5;
export const TARGET_MIN_S = 50;
export const TARGET_MAX_S = 60;
/**
 * Overshoot worth living with. Every alternative — trimming to the clock,
 * dropping a beat — costs more than a clip that runs a few seconds long.
 */
const OVERSHOOT_S = 12;

const ROLES = new Set(["setup", "beat", "turn", "payoff"]);

function role(value: unknown): StorySegment["role"] {
  const text = String(value ?? "").toLowerCase();
  return ROLES.has(text) ? (text as StorySegment["role"]) : "beat";
}

export function totalDuration(segments: StorySegment[]) {
  return segments.reduce((sum, s) => sum + (s.end - s.start), 0);
}

/**
 * Turns the model's chosen moments into spans that exist on the tape.
 *
 * Both ends are anchored on quoted words, and that is not a stylistic choice.
 * Auto-generated captions carry almost no punctuation (6% of words here) and
 * Supadata interpolates word timings evenly, so there are no pauses either:
 * nothing in the transcript marks where a sentence ends. Deriving an end from
 * the clock instead — start plus a budget — is what cut speakers off
 * mid-thought and made assembled clips incoherent. The model reads the words,
 * so the model says where each thought stops.
 */
export function buildSegments(raw: unknown, words: WordTiming[]): StorySegment[] {
  const rows = (Array.isArray(raw) ? raw : []).filter(
    (row): row is Record<string, unknown> => Boolean(row) && typeof row === "object",
  );
  if (!rows.length) return [];

  const drafts: StorySegment[] = [];
  for (const record of rows) {
    const hintStart = pickOffset(record, ["start", "start_s", "startSec", "from"]);
    const hintEnd = pickOffset(record, ["end", "end_s", "endSec", "to"]);

    const startQuote = String(record.startQuote ?? record.quote ?? record.text ?? "").slice(0, 220);
    const endQuote = String(record.endQuote ?? "").slice(0, 220);

    const at = findPhrase(words, startQuote, hintStart ?? undefined);
    const from = at >= 0 ? words[at].start : hintStart;
    if (from == null) continue;
    const startAnchored = at >= 0;

    // The end of the quoted closing line, not a timestamp. Searched forward
    // from the segment's own start so a phrase repeated later in the tape
    // cannot stretch the segment across half the video.
    const closing = endQuote ? findPhraseSpan(words, endQuote, from) : null;
    let to = closing && words[closing.to].end > from ? words[closing.to].end : null;
    const endAnchored = to != null;

    if (to == null || to - from < MIN_SEGMENT_S || to - from > MAX_SEGMENT_S) {
      // No usable closing quote: fall back to the model's numbers, which at
      // least came from the same reading of the transcript.
      const hinted = hintEnd != null ? hintEnd - (hintStart ?? from) : 0;
      const span = Math.min(MAX_SEGMENT_S, Math.max(MIN_SEGMENT_S, hinted || 14));
      const lastWord = words.find((w) => w.start >= from + span) ?? words[words.length - 1];
      to = Math.max(from + MIN_SEGMENT_S, lastWord.end);
    }

    // One line per segment, so the anchor hit rate is greppable in production.
    // It is the number that decides whether the model is worth changing: the
    // model's only influence on where a cut lands is whether its quotes can be
    // found, and a fallback here is a boundary taken from the clock instead.
    console.info(
      `[diag] segment anchor=start:${startAnchored ? "quote" : "hint"},` +
        `end:${endAnchored ? "quote" : "hint"} ` +
        `drift=${startAnchored && hintStart != null ? (from - hintStart).toFixed(1) : "n/a"}s ` +
        `role=${role(record.role)}`,
    );

    drafts.push({
      start: Math.max(0, from),
      end: to,
      quote: startQuote,
      role: role(record.role),
    });
  }

  if (!drafts.length) return [];

  // Chronological and non-overlapping. Two quotes can anchor onto the same
  // line, and a clip that plays a sentence twice is worse than a shorter one.
  drafts.sort((a, b) => a.start - b.start);
  const ordered: StorySegment[] = [];
  for (const draft of drafts) {
    const previous = ordered[ordered.length - 1];
    if (previous && draft.start < previous.end + MERGE_GAP_S) {
      // Merge only when the result is still a segment. A bad anchor that put
      // this draft's end a minute late would otherwise be swallowed whole,
      // dragging a minute of unchosen speech into the previous span.
      const merged = Math.max(previous.end, draft.end);
      if (merged - previous.start <= MAX_SEGMENT_S) {
        previous.end = merged;
        continue;
      }
    }
    ordered.push(draft);
  }

  // Deliberately unfitted. The caller measures the real total and sends it back
  // to the model, which is the only party that can shorten a story by choosing
  // less of it. Fitting here hid the overrun from that correction entirely.
  return ordered;
}

/**
 * Last resort, when the model has already been asked twice to shorten the story
 * and hasn't. Exported because the decision to give up belongs to the caller.
 *
 * Nothing here trims: a span ends where the model said the sentence ends, and
 * shaving seconds off that end is exactly the damage this is meant to prevent.
 * The only lever is dropping a whole beat.
 *
 * Which beat matters. Dropping the longest middle segment is how the turn used
 * to disappear — it is usually the longest thing in the clip, and a clip whose
 * reversal has been deleted is the "this makes no sense" complaint. So the
 * setup, the turn and the payoff are all off the table, and if only those
 * remain the clip runs long instead. A 78-second clip with an intact arc is a
 * better video than a 60-second one missing its middle.
 */
export function fit(segments: StorySegment[]): StorySegment[] {
  let result = segments.map((s) => ({ ...s }));

  while (totalDuration(result) > TARGET_MAX_S + OVERSHOOT_S && result.length > 2) {
    const turns = result.filter((s) => s.role === "turn").length;
    const droppable = result
      .slice(1, -1)
      .filter((s) => s.role !== "payoff" && !(s.role === "turn" && turns <= 1));
    if (!droppable.length) break;
    const fattest = droppable.reduce((a, b) => (b.end - b.start > a.end - a.start ? b : a));
    console.info(
      `[diag] fit dropped role=${fattest.role} ` +
        `dur=${(fattest.end - fattest.start).toFixed(1)}s to reach ${TARGET_MAX_S + OVERSHOOT_S}s`,
    );
    result = result.filter((s) => s !== fattest);
  }

  return result;
}
