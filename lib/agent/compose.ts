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
  const lines: CaptionLine[] = [];
  let buf: WordTiming[] = [];
  const flush = () => {
    if (!buf.length) return;
    lines.push({
      start: buf[0].start,
      end: Math.max(buf[buf.length - 1].end, buf[0].start + 0.12),
      words: buf,
    });
    buf = [];
  };
  for (const word of slice) {
    buf.push(word);
    const span = buf[buf.length - 1].end - buf[0].start;
    if (buf.length >= 3 || span >= 1.05) flush();
  }
  flush();
  return lines;
}
