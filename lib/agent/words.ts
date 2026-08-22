import type { TranscriptSegment, WordTiming } from "@/lib/agent/types";

const MIN_WORD_S = 0.08;

/**
 * Approximate per-word timing inside a caption segment when only segment-level
 * timing is known (YouTube auto-captions, VTT). Weighs each word by character
 * length instead of splitting the segment evenly — closer to real speech,
 * where short words ("a", "is") are spoken faster than long ones.
 */
export function explodeWords(segments: TranscriptSegment[]): WordTiming[] {
  const words: WordTiming[] = [];
  for (const seg of segments) {
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
  return words;
}
