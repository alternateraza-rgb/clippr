import { readFile } from "node:fs/promises";
import { env } from "../../lib/config";
import type { WordTiming } from "../../lib/agent/types";

function openaiKey() {
  return env("OPENAI_API_KEY") || env("LLM_API_KEY");
}

export type Sentence = { start: number; end: number; text: string };

export async function transcribeFile(path: string): Promise<{
  words: WordTiming[];
  sentences: Sentence[];
  language: string;
  text: string;
}> {
  const key = openaiKey();
  if (!key) throw new Error("OPENAI_API_KEY or LLM_API_KEY required for Whisper");

  const bytes = await readFile(path);
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(bytes)], { type: "audio/mpeg" }), "audio.mp3");
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "word");
  // Segments are the reason this call exists twice over: Whisper's words carry
  // no punctuation at all, but its segments are complete, punctuated sentences
  // with real timings. That is the only trustworthy signal for where a thought
  // actually ends — auto-captions have neither punctuation nor pauses.
  form.append("timestamp_granularities[]", "segment");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Whisper ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }
  const data = (await res.json()) as {
    text?: string;
    language?: string;
    words?: Array<{ word?: string; start?: number; end?: number }>;
    segments?: Array<{ text?: string; start?: number; end?: number }>;
  };
  const words: WordTiming[] = (data.words ?? [])
    .map((w) => ({
      text: (w.word ?? "").trim(),
      start: Number(w.start) || 0,
      end: Number(w.end) || 0,
    }))
    .filter((w) => w.text);
  const sentences: Sentence[] = (data.segments ?? [])
    .map((s) => ({
      start: Number(s.start) || 0,
      end: Number(s.end) || 0,
      text: (s.text ?? "").trim(),
    }))
    .filter((s) => s.text && s.end > s.start);

  return {
    words,
    sentences,
    language: data.language || "en",
    text: data.text || "",
  };
}
