import { explodeWords } from "../../lib/agent/words";
import type { TranscriptSegment, WordTiming } from "../../lib/agent/types";

export { explodeWords };

function parseClock(raw: string) {
  const parts = raw.trim().split(":");
  if (parts.length === 3) {
    return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2].replace(",", "."));
  }
  if (parts.length === 2) {
    return Number(parts[0]) * 60 + Number(parts[1].replace(",", "."));
  }
  return Number(raw.replace(",", ".")) || 0;
}

function stripTags(text: string) {
  return text.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
}

export function parseVtt(raw: string): TranscriptSegment[] {
  const blocks = raw.replace(/^\uFEFF/, "").split(/\n\s*\n/);
  const segments: TranscriptSegment[] = [];
  for (const block of blocks) {
    const lines = block.split(/\r?\n/).filter((l) => l.trim() && l.trim() !== "WEBVTT");
    const time = lines.find((l) => l.includes("-->"));
    if (!time) continue;
    const [startRaw, endRaw] = time.split("-->").map((s) => s.trim().split(" ")[0]);
    const text = stripTags(
      lines
        .filter((l) => !l.includes("-->") && !/^\d+$/.test(l.trim()))
        .join(" "),
    );
    if (!text) continue;
    const start = parseClock(startRaw);
    const end = Math.max(start + 0.2, parseClock(endRaw));
    segments.push({ start, end, text });
  }
  return segments;
}

export function segmentsFromWords(words: WordTiming[]): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  let buf: WordTiming[] = [];
  const flush = () => {
    if (!buf.length) return;
    segments.push({
      start: buf[0].start,
      end: buf[buf.length - 1].end,
      text: buf.map((w) => w.text).join(" "),
      words: buf,
    });
    buf = [];
  };
  for (const word of words) {
    buf.push(word);
    const span = buf[buf.length - 1].end - buf[0].start;
    if (span >= 6 || /[.!?]$/.test(word.text)) flush();
  }
  flush();
  return segments;
}
