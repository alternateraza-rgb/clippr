import { explodeWords, type TranscriptResult } from "@/lib/agent/transcript";
import type { TranscriptSegment } from "@/lib/agent/types";
import { env, hasSupadata } from "@/lib/config";

type Chunk = { text?: string; offset?: number; duration?: number };
type TranscriptBody = {
  jobId?: string;
  content?: string | Chunk[];
  lang?: string;
  status?: string;
  error?: string;
};

function youtubeUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Supadata reports offsets in milliseconds on some routes and in seconds on
 * others, with nothing in the payload to say which.
 *
 * Decided once for the whole transcript rather than per chunk. Guessing per
 * chunk read a millisecond transcript's opening cues — small offset, short
 * duration — as seconds, which planted the first minute of the tape several
 * minutes into the timeline while the rest of it sat in the right place.
 */
function unitDivisor(chunks: Chunk[]): number {
  let maxOffset = 0;
  let maxDuration = 0;
  for (const c of chunks) {
    maxOffset = Math.max(maxOffset, Number(c.offset) || 0);
    maxDuration = Math.max(maxDuration, Number(c.duration) || 0);
  }
  // No caption cue runs two minutes, and no tape we accept runs 20,000 seconds.
  return maxOffset > 20_000 || maxDuration > 120 ? 1000 : 1;
}

function fromChunks(chunks: Chunk[], language: string, generated: boolean): TranscriptResult | null {
  const divisor = unitDivisor(chunks);
  const segments: TranscriptSegment[] = chunks
    .map((c) => {
      const start = (Number(c.offset) || 0) / divisor;
      const dur = Math.max((Number(c.duration) || 0) / divisor, 0.2);
      return { start, end: start + dur, text: (c.text || "").trim() };
    })
    .filter((s) => s.text);
  const words = explodeWords(segments);
  if (!words.length) return null;
  return {
    segments,
    words,
    language: language || "en",
    source: generated ? "whisper" : "captions",
  };
}

async function getJson(url: string, key: string) {
  const res = await fetch(url, {
    headers: { "x-api-key": key },
    signal: AbortSignal.timeout(60_000),
  });
  const body = (await res.json().catch(() => ({}))) as TranscriptBody;
  return { status: res.status, body };
}

export async function fetchSupadataTranscript(videoId: string): Promise<TranscriptResult | null> {
  if (!hasSupadata()) return null;
  const key = env("SUPADATA_API_KEY");
  const url = `https://api.supadata.ai/v1/transcript?url=${encodeURIComponent(youtubeUrl(videoId))}&lang=en&mode=auto`;
  let { status, body } = await getJson(url, key);

  if (status === 202 && body.jobId) {
    const jobUrl = `https://api.supadata.ai/v1/transcript/${body.jobId}`;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const next = await getJson(jobUrl, key);
      if (next.body.status === "failed") return null;
      if (next.body.status === "completed" || next.status === 200) {
        body = next.body;
        status = 200;
        break;
      }
    }
  }

  if (status !== 200) return null;
  if (Array.isArray(body.content)) return fromChunks(body.content, body.lang || "en", false);
  if (typeof body.content === "string" && body.content.trim()) {
    // Plain text means Supadata had no timings for this video. There is nothing
    // to salvage: the entire value of a transcript here is its timing, and the
    // shape this used to return — one segment spanning the whole tape, with
    // every word interpolated linearly across it — put word timestamps minutes
    // away from the words. Nothing downstream survives that: the quote anchor's
    // `near` hint, the sentence snap, and the download pad are all built for
    // single-digit-second error.
    //
    // Returning null is what lets the caller fall through to a provider that
    // does have timings. Answering "success" here is what prevented that.
    console.warn("[supadata] plain-text content, no timings — falling through");
    return null;
  }
  return null;
}
