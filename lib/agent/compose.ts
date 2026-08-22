import { linesFromWords } from "@/lib/fixtures/captions";
import type { CaptionLine, WordTiming } from "@/lib/agent/types";

export function captionLinesForRange(
  words: WordTiming[],
  start: number,
  end: number,
): CaptionLine[] {
  const slice = words
    .filter((w) => w.start >= start - 0.05 && w.start < end)
    .map((w) => ({
      text: w.text,
      start: Math.max(0, w.start - start),
      end: Math.max(0.05, w.end - start),
    }));
  return linesFromWords(slice, 3);
}
