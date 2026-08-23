import type { CaptionLine, WordTiming } from "@/lib/agent/types";

export function captionLinesForRange(
  words: WordTiming[],
  start: number,
  end: number,
): CaptionLine[] {
  // Only words actually inside the window. This used to fall back to "the 12
  // nearest words" and rebase them onto the clip, which puts captions on screen
  // for speech that is not being spoken. No captions beats wrong captions.
  const overlapping = words.filter((w) => w.end > start && w.start < end);
  const slice = overlapping.map((w) => ({
    text: w.text,
    start: Math.max(0, w.start - start),
    end: Math.max(0.05, w.end - start),
  }));
  const MIN_LINE_S = 0.32;
  const GAP_BREAK_S = 0.45;
  const lines: CaptionLine[] = [];
  let buf: WordTiming[] = [];
  const flush = () => {
    if (!buf.length) return;
    lines.push({
      start: buf[0].start,
      end: Math.max(buf[buf.length - 1].end, buf[0].start + MIN_LINE_S),
      words: buf,
    });
    buf = [];
  };
  for (const word of slice) {
    const prev = buf[buf.length - 1];
    if (prev && word.start - prev.end >= GAP_BREAK_S) flush();
    buf.push(word);
    const span = buf[buf.length - 1].end - buf[0].start;
    if (buf.length >= 3 || span >= 1.05) flush();
  }
  flush();
  // The MIN_LINE_S floor can push a short line's `end` past the next line's
  // actual start — clamp it back so the padding never delays the next line's
  // real display time (which is driven by `start`, not `end`).
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].end > lines[i + 1].start) lines[i].end = lines[i + 1].start;
  }
  return lines;
}
