import type { CaptionLine, WordTiming } from "@/lib/agent/types";

function shiftWord(word: WordTiming, shift: number): WordTiming {
  return {
    text: word.text,
    start: Math.max(0, word.start - shift),
    end: Math.max(0.05, word.end - shift),
  };
}

/** Map leaked absolute timestamps (e.g. 522s) onto the 0…duration clip clock. */
export function normalizeCaptionLines(lines: CaptionLine[], clipDuration: number): CaptionLine[] {
  if (!lines.length) return [];
  const min = Math.min(...lines.map((line) => line.start));
  const shift = min > clipDuration + 1 ? min : 0;
  return lines
    .map((line) => ({
      start: Math.max(0, line.start - shift),
      end: Math.max(0.05, line.end - shift),
      words: (line.words.length
        ? line.words
        : [{ text: line.words[0]?.text || " ", start: line.start, end: line.end }]
      ).map((word) => shiftWord(word, shift)),
    }))
    .filter((line) => line.words.some((word) => word.text.trim()));
}

export function fallbackCaptionLine(text: string, duration: number): CaptionLine {
  const tokens = text.split(/\s+/).filter(Boolean).slice(0, 16);
  const span = Math.max(duration, 1) / Math.max(tokens.length, 1);
  const words: WordTiming[] = (tokens.length ? tokens : [text || "CLIP"]).map((token, i) => ({
    text: token,
    start: i * span,
    end: (i + 1) * span,
  }));
  return { start: 0, end: Math.max(duration, 1), words };
}

/** Keep the current (or last started) line on screen — never a gap. */
export function stickyCaptionLine(lines: CaptionLine[], time: number): CaptionLine | null {
  if (!lines.length) return null;
  let current = lines[0];
  for (const line of lines) {
    if (time + 0.05 >= line.start) current = line;
    else break;
  }
  return current;
}

/**
 * Anchors the caption clock to the iframe's real playback position instead of
 * assuming autoplay started the instant we asked it to. Call `sync()` whenever
 * a fresh `currentTime` arrives from the YouTube IFrame API (`infoDelivery`),
 * then `elapsed()` interpolates from that anchor with a local timer between
 * messages so the clock stays smooth without drifting.
 */
export function createPlaybackClock() {
  let anchorMs = performance.now();
  let anchorTime = 0;
  let live = false;
  return {
    sync(currentTime: number, now = performance.now()) {
      anchorMs = now;
      anchorTime = Math.max(0, currentTime);
      live = true;
    },
    reset() {
      anchorMs = performance.now();
      anchorTime = 0;
      live = false;
    },
    elapsed(now = performance.now()) {
      if (!live) return 0;
      return Math.max(0, anchorTime + (now - anchorMs) / 1000);
    },
  };
}
