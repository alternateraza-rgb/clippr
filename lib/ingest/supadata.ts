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

function fromChunks(chunks: Chunk[], language: string, generated: boolean): TranscriptResult | null {
  const segments: TranscriptSegment[] = chunks
    .map((c) => {
      const start = (Number(c.offset) || 0) / 1000;
      const dur = (Number(c.duration) || 0) / 1000;
      return { start, end: start + Math.max(dur, 0.2), text: (c.text || "").trim() };
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
    const segments: TranscriptSegment[] = [{ start: 0, end: Math.max(8, body.content.length / 12), text: body.content }];
    return fromChunks(
      [{ text: body.content, offset: 0, duration: segments[0].end * 1000 }],
      body.lang || "en",
      true,
    );
  }
  return null;
}
