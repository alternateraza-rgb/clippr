import { captionLinesForRange } from "@/lib/agent/compose";
import { heuristicCandidates } from "@/lib/agent/heuristic";
import { RUBRIC } from "@/lib/agent/rubric";
import { timedScript, type TranscriptResult } from "@/lib/agent/transcript";
import { env, hasLlm, llmModel, llmProvider } from "@/lib/config";
import { weightedScore } from "@/lib/format";
import type { ClipCandidate, Niche, ScoreBreakdown, WordTiming } from "@/lib/agent/types";

export type ScoreMeta = {
  model: string;
  tokens: number;
  ms: number;
  source: "llm" | "heuristic";
};

type LlmCandidate = {
  start: number;
  end: number;
  hook: string;
  whyItClips: string;
  scores: ScoreBreakdown;
};

function clampScore(n: unknown) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 50;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function toCandidates(raw: LlmCandidate[], words: WordTiming[]): ClipCandidate[] {
  return raw
    .filter((c) => Number.isFinite(c.start) && Number.isFinite(c.end) && c.end - c.start >= 8)
    .slice(0, 5)
    .map((c, i) => {
      const scores: ScoreBreakdown = {
        hook: clampScore(c.scores?.hook),
        emotion: clampScore(c.scores?.emotion),
        selfContained: clampScore(c.scores?.selfContained),
        quotability: clampScore(c.scores?.quotability),
        payoff: clampScore(c.scores?.payoff),
      };
      return {
        id: `c-${i + 1}`,
        start: Math.max(0, c.start),
        end: Math.max(c.start + 8, c.end),
        hook: String(c.hook || "").slice(0, 220),
        whyItClips: String(c.whyItClips || "").slice(0, 400),
        score: weightedScore(scores),
        scores,
        captionLines: captionLinesForRange(words, c.start, c.end),
      };
    });
}

export async function scoreTranscript(
  transcript: TranscriptResult,
  niche: Niche,
): Promise<{ candidates: ClipCandidate[]; meta: ScoreMeta }> {
  if (!hasLlm() || !transcript.words.length) {
    const started = Date.now();
    return {
      candidates: heuristicCandidates(transcript.words),
      meta: { model: "heuristic", tokens: 0, ms: Date.now() - started, source: "heuristic" },
    };
  }

  const started = Date.now();
  const script = timedScript(transcript.segments);
  const user = `Niche: ${niche}\n\nTranscript:\n${script}`;

  try {
    const { text, tokens, model } = await completeJson(user);
    const parsed = JSON.parse(text) as { candidates?: LlmCandidate[] };
    const candidates = toCandidates(parsed.candidates ?? [], transcript.words);
    if (!candidates.length) throw new Error("empty llm candidates");
    return {
      candidates,
      meta: { model, tokens, ms: Date.now() - started, source: "llm" },
    };
  } catch {
    return {
      candidates: heuristicCandidates(transcript.words),
      meta: { model: "heuristic", tokens: 0, ms: Date.now() - started, source: "heuristic" },
    };
  }
}

async function completeJson(user: string): Promise<{ text: string; tokens: number; model: string }> {
  const provider = llmProvider();
  const model = llmModel();
  const key = env("LLM_API_KEY");

  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1600,
        system: `${RUBRIC}\nRespond with JSON only: {"candidates":[...]}`,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}`);
    const data = (await res.json()) as {
      content?: Array<{ text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = data.content?.map((c) => c.text ?? "").join("") ?? "";
    return {
      text: extractJson(text),
      tokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
      model,
    };
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${RUBRIC}\nRespond with JSON: {"candidates":[...]}` },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { total_tokens?: number };
  };
  return {
    text: extractJson(data.choices?.[0]?.message?.content ?? "{}"),
    tokens: data.usage?.total_tokens ?? 0,
    model,
  };
}

function extractJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) return "{}";
  return text.slice(start, end + 1);
}
