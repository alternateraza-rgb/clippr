import { captionLinesForRange } from "@/lib/agent/compose";
import { heuristicCandidates } from "@/lib/agent/heuristic";
import { RUBRIC } from "@/lib/agent/rubric";
import { timedScript, type TranscriptResult } from "@/lib/agent/transcript";
import { hasLlm } from "@/lib/config";
import { completeJson } from "@/lib/llm/complete";
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

async function scoreWithLlm(
  transcript: TranscriptResult,
  niche: Niche,
): Promise<{ candidates: ClipCandidate[]; model: string; tokens: number }> {
  const script = timedScript(transcript.segments);
  const { text, tokens, model } = await completeJson({
    system: `${RUBRIC}\nRespond with JSON: {"candidates":[...]}`,
    user: `Niche: ${niche}\n\nTranscript:\n${script}`,
  });
  let parsed: { candidates?: LlmCandidate[] };
  try {
    parsed = JSON.parse(text) as { candidates?: LlmCandidate[] };
  } catch {
    throw new Error("LLM returned invalid JSON");
  }
  const candidates = toCandidates(parsed.candidates ?? [], transcript.words);
  if (!candidates.length) throw new Error("LLM returned no usable clip windows");
  return { candidates, model, tokens };
}

export async function scoreTranscript(
  transcript: TranscriptResult,
  niche: Niche,
): Promise<{ candidates: ClipCandidate[]; meta: ScoreMeta }> {
  if (!transcript.words.length) {
    throw new Error("No transcript words to score.");
  }

  if (!hasLlm()) {
    const started = Date.now();
    return {
      candidates: heuristicCandidates(transcript.words),
      meta: { model: "heuristic", tokens: 0, ms: Date.now() - started, source: "heuristic" },
    };
  }

  const started = Date.now();
  let last: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { candidates, model, tokens } = await scoreWithLlm(transcript, niche);
      return {
        candidates,
        meta: { model, tokens, ms: Date.now() - started, source: "llm" },
      };
    } catch (error) {
      last = error;
      console.error("[score] LLM attempt failed", attempt + 1, error);
    }
  }
  const detail = last instanceof Error ? last.message : "unknown error";
  throw new Error(`LLM scoring failed (${detail}). Check LLM_API_KEY / LLM_PROVIDER on Vercel.`);
}
