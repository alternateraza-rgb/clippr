import type { CaptionLine, WordTiming } from "@/lib/agent/types";

export function captionLinesForRange(
  words: WordTiming[],
  start: number,
  end: number,
): CaptionLine[] {
  const overlapping = words.filter((w) => w.end > start && w.start < end);
  const nearby =
    overlapping.length > 0
      ? overlapping
      : words
          .filter((w) => w.text.trim())
          .slice()
          .sort((a, b) => Math.abs(a.start - start) - Math.abs(b.start - start))
          .slice(0, 12)
          .sort((a, b) => a.start - b.start);
  const slice = nearby.map((w) => ({
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
