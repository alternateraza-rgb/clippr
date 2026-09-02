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

/**
 * Word timings read from the cue payload, rather than guessed from it.
 *
 * YouTube's auto-caption VTT carries a timestamp per word inline:
 *
 *   <00:00:12.345><c>word</c><00:00:12.610><c> next</c>
 *
 * `parseVtt` strips those tags and `explodeWords` then re-invents the same
 * timings by spreading each cue across its words by character length — real
 * measurements thrown away and replaced with a linear model good to a second or
 * two. Over a 5-second cue that is enough to start a clip on the wrong word.
 *
 * Returns [] when the file carries no inline tags, which is normal for
 * manually-uploaded subtitles; the caller falls back to interpolation there.
 */
export function parseVttWords(raw: string): WordTiming[] {
  const words: WordTiming[] = [];
  const blocks = raw.replace(/^\uFEFF/, "").split(/\n\s*\n/);
  const key = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, "");
  let sawStamp = false;

  /** True when `tokens` is exactly what we just emitted — the rolling repeat. */
  const alreadySaid = (tokens: string[]) => {
    if (!tokens.length || tokens.length > words.length) return false;
    const tailStart = words.length - tokens.length;
    return tokens.every((t, i) => key(t) === key(words[tailStart + i].text));
  };

  for (const block of blocks) {
    const lines = block.split(/\r?\n/).filter((l) => l.trim() && l.trim() !== "WEBVTT");
    const time = lines.find((l) => l.includes("-->"));
    if (!time) continue;
    const [startRaw, endRaw] = time.split("-->").map((l) => l.trim().split(" ")[0]);
    const cueStart = parseClock(startRaw);
    const cueEnd = Math.max(cueStart + 0.2, parseClock(endRaw));
    const payload = lines.filter((l) => !l.includes("-->") && !/^\d+$/.test(l.trim())).join(" ");
    if (!payload.trim()) continue;

    const parts = payload.split(/<(\d{2}:\d{2}:\d{2}[.,]\d{3})>/);
    const cueWords: WordTiming[] = [];
    if (parts.length > 1) sawStamp = true;

    // parts[0] is whatever precedes the first stamp. On a rolling auto-caption
    // that is the previous line said again, and it must be dropped rather than
    // re-timed to this cue — re-timing it compresses several seconds of speech
    // into the gap before the first stamp. On the opening cue, and on any cue
    // that starts a genuinely new line, it is real and starts with the cue.
    const lead = parts[0].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
    const leadTokens = lead ? lead.split(/\s+/) : [];
    const stamped = parts.length > 1;

    if (leadTokens.length && !alreadySaid(leadTokens)) {
      if (stamped) {
        // Bounded by the first stamp, which is where the next word begins.
        const until = parseClock(parts[1]);
        const span = Math.max(until - cueStart, leadTokens.length * 0.08);
        leadTokens.forEach((token, i) => {
          const from = cueStart + (span * i) / leadTokens.length;
          cueWords.push({ text: token, start: from, end: from + span / leadTokens.length });
        });
      } else {
        // No stamps anywhere in this cue: nothing to measure against, so spread
        // it. Same guess explodeWords makes, confined to cues that give us
        // nothing better.
        const span = Math.max(cueEnd - cueStart, leadTokens.length * 0.08);
        leadTokens.forEach((token, i) => {
          const from = cueStart + (span * i) / leadTokens.length;
          cueWords.push({ text: token, start: from, end: from + span / leadTokens.length });
        });
      }
    }

    // Odd indices are the captured clocks; each one times the text after it.
    for (let i = 1; i < parts.length; i += 2) {
      const at = parseClock(parts[i]);
      const text = (parts[i + 1] ?? "").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
      if (!text) continue;
      for (const token of text.split(/\s+/)) {
        // end is filled in below, from wherever the next word starts.
        cueWords.push({ text: token, start: at, end: 0 });
      }
    }

    // A stamp marks where a word begins, so within this cue each stamped word
    // ends where the next begins, and the last ends with the cue.
    for (let i = 0; i < cueWords.length; i++) {
      const next = cueWords[i + 1];
      const until = next ? next.start : cueEnd;
      cueWords[i].end = Math.max(cueWords[i].start + 0.08, cueWords[i].end || until);
    }
    words.push(...cueWords);
  }

  // Nothing in this file was measured — manually-uploaded subtitles. Report
  // empty so the caller interpolates and labels it as interpolated.
  if (!sawStamp || !words.length) return [];

  words.sort((a, b) => a.start - b.start || a.end - b.end);

  // Backstop for repeats the sequence check missed — a partial overlap, or a
  // cue that re-stamps a word it already showed.
  const clean: WordTiming[] = [];
  for (const word of words) {
    const previous = clean[clean.length - 1];
    if (previous && key(previous.text) === key(word.text) && Math.abs(previous.start - word.start) < 0.75) {
      continue;
    }
    const from = previous ? Math.max(word.start, previous.end) : word.start;
    clean.push({ text: word.text, start: from, end: Math.max(from + 0.08, word.end) });
  }
  return clean;
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
