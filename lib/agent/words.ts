import type { TranscriptSegment, WordTiming } from "@/lib/agent/types";

const MIN_WORD_S = 0.08;

/**
 * Approximate per-word timing inside a caption segment when only segment-level
 * timing is known (YouTube auto-captions, VTT). Weighs each word by character
 * length instead of splitting the segment evenly — closer to real speech,
 * where short words ("a", "is") are spoken faster than long ones.
 */
function normalizeWord(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9']/g, "");
}

export function explodeWords(segments: TranscriptSegment[]): WordTiming[] {
  // YouTube's rolling captions overlap: consecutive lines share their tail and
  // their time ranges intersect. Exploding them in segment order produced a
  // word stream that was out of chronological order and full of repeats, so
  // anything locating a phrase by walking the array — or cutting at a word's
  // timestamp — was working against scrambled data.
  const inOrder = [...segments].sort((a, b) => a.start - b.start);
  const trimmed = inOrder.map((seg, i) => {
    const next = inOrder[i + 1];
    return next && next.start > seg.start && next.start < seg.end
      ? { ...seg, end: next.start }
      : seg;
  });

  const words: WordTiming[] = [];
  for (const seg of trimmed) {
    const tokens = seg.text
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .filter(Boolean);
    if (!tokens.length) continue;
    const span = Math.max(seg.end - seg.start, 0.2);
    const weights = tokens.map((t) => Math.max(t.replace(/[^a-zA-Z0-9']/g, "").length, 1) + 1);
    const total = weights.reduce((a, b) => a + b, 0);
    let cursor = seg.start;
    tokens.forEach((text, i) => {
      const share = (weights[i] / total) * span;
      const start = cursor;
      const end = Math.min(seg.end, Math.max(start + MIN_WORD_S, start + share));
      words.push({ text, start, end });
      cursor = end;
    });
  }

  words.sort((a, b) => a.start - b.start || a.end - b.end);

  const clean: WordTiming[] = [];
  for (const word of words) {
    const previous = clean[clean.length - 1];
    // The same word at nearly the same moment is the overlap repeating itself.
    if (
      previous &&
      normalizeWord(previous.text) === normalizeWord(word.text) &&
      Math.abs(previous.start - word.start) < 0.75
    ) {
      continue;
    }
    const start = previous ? Math.max(word.start, previous.end) : word.start;
    clean.push({ text: word.text, start, end: Math.max(start + MIN_WORD_S, word.end) });
  }
  return clean;
}
