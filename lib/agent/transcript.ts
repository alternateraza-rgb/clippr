import { getSubtitles, getVideoDetails } from "youtube-caption-extractor";
import type { TranscriptSegment, WordTiming } from "@/lib/agent/types";

export class CaptionsDisabledError extends Error {
  constructor(message = "Captions are disabled on this video") {
    super(message);
    this.name = "CaptionsDisabledError";
  }
}

export type TranscriptResult = {
  segments: TranscriptSegment[];
  words: WordTiming[];
  language: string;
  source: "captions" | "whisper" | "none";
  title?: string;
};

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
    tokens.forEach((text, i) => {
      const start = seg.start + (span * i) / tokens.length;
      const end = seg.start + (span * (i + 1)) / tokens.length;
      words.push({ text, start, end });
    });
  }
  return words;
}

export async function fetchTranscript(videoId: string): Promise<TranscriptResult> {
  try {
    const details = await getVideoDetails({ videoID: videoId, lang: "en" });
    const raw = details.subtitles?.length
      ? details.subtitles
      : await getSubtitles({ videoID: videoId, lang: "en" });
    if (!raw?.length) throw new CaptionsDisabledError();
    const segments: TranscriptSegment[] = raw.map((row) => {
      const start = Number(row.start) || 0;
      const dur = Number(row.dur) || 0;
      return {
        start,
        end: start + dur,
        text: decode(row.text),
      };
    });
    return {
      segments,
      words: explodeWords(segments),
      language: "en",
      source: "captions",
      title: details.title,
    };
  } catch (error) {
    if (error instanceof CaptionsDisabledError) throw error;
    throw new CaptionsDisabledError(
      error instanceof Error ? error.message : "Could not fetch captions",
    );
  }
}

function decode(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n/g, " ")
    .trim();
}

export function timedScript(segments: TranscriptSegment[], maxChars = 28_000) {
  const lines = segments.map((seg) => {
    const m = Math.floor(seg.start / 60);
    const s = Math.floor(seg.start % 60)
      .toString()
      .padStart(2, "0");
    return `[${m}:${s}] ${seg.text}`;
  });
  let out = "";
  for (const line of lines) {
    if (out.length + line.length + 1 > maxChars) break;
    out += (out ? "\n" : "") + line;
  }
  return out;
}
