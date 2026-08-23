import { captionLinesForRange } from "@/lib/agent/compose";
import { heuristicCandidates } from "@/lib/agent/heuristic";
import { RUBRIC } from "@/lib/agent/rubric";
import { snapRange, tightenRange } from "@/lib/agent/snap";
import { pickOffset } from "@/lib/agent/time";
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

function clampScore(n: unknown) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 50;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function asRows(parsed: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(parsed)) {
    return parsed.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object");
  }
  if (parsed && typeof parsed === "object") {
    const o = parsed as Record<string, unknown>;
    for (const key of ["candidates", "clips", "windows", "results"]) {
      if (Array.isArray(o[key])) return asRows(o[key]);
    }
  }
  return [];
}

function toCandidates(raw: unknown, words: WordTiming[]): ClipCandidate[] {
  return asRows(raw)
    .map((c, i) => {
      const startRaw = pickOffset(c, ["start", "start_s", "startSec", "startTime", "from", "t0"]);
      const endRaw = pickOffset(c, ["end", "end_s", "endSec", "endTime", "to", "t1"]);
      if (startRaw == null || endRaw == null) return null;
      const hook = String(c.hook || c.title || "").slice(0, 220);
      const snapped = snapRange(startRaw, Math.max(startRaw + 45, endRaw), hook, words);
      const tightened = tightenRange(words, snapped.start, snapped.end);
      const start = tightened.start;
      const finish = tightened.end;
      const nested = (c.scores && typeof c.scores === "object" ? c.scores : c) as Record<string, unknown>;
      const scores: ScoreBreakdown = {
        hook: clampScore(nested.hook),
        emotion: clampScore(nested.emotion),
        selfContained: clampScore(nested.selfContained ?? nested.self_contained),
        quotability: clampScore(nested.quotability ?? nested.quotable),
        payoff: clampScore(nested.payoff),
      };
      return {
        id: `c-${i + 1}`,
        start: Math.max(0, start),
        end: finish,
        hook,
        whyItClips: String(c.whyItClips || c.why_it_clips || c.reason || "").slice(0, 400),
        score: weightedScore(scores),
        scores,
        captionLines: captionLinesForRange(words, start, finish),
      } satisfies ClipCandidate;
    })
    .filter((c): c is ClipCandidate => Boolean(c))
    .slice(0, 3);
}

async function scoreWithLlm(
  transcript: TranscriptResult,
  niche: Niche,
  extra?: string,
): Promise<{ candidates: ClipCandidate[]; model: string; tokens: number }> {
  const script = timedScript(transcript.segments);
  const { text, tokens, model } = await completeJson({
    system: `${RUBRIC}\nRespond with JSON: {"candidates":[{"start":0,"end":20,"hook":"","whyItClips":"","scores":{}}]}`,
    user: extra ? `${extra}\n\nNiche: ${niche}\n\nTranscript:\n${script}` : `Niche: ${niche}\n\nTranscript:\n${script}`,
  });
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("LLM returned invalid JSON");
  }
  const candidates = toCandidates(parsed, transcript.words);
  if (!candidates.length) throw new Error("LLM returned no usable clip windows");
  return { candidates, model, tokens };
}

function blameKey(message: string) {
  return /401|403|invalid api key|incorrect api key|LLM_API_KEY missing|authentication/i.test(message);
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
      const extra =
        attempt === 0
          ? undefined
          : 'Previous reply was unusable. start and end must be JSON numbers in seconds (522.4), never "8:42". Return {"candidates":[...]} with exactly 3 clips, each 50-60 seconds long.';
      const { candidates, model, tokens } = await scoreWithLlm(transcript, niche, extra);
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
  if (blameKey(detail)) {
    throw new Error(`LLM scoring failed (${detail}). Check LLM_API_KEY / LLM_PROVIDER on Vercel.`);
  }
  throw new Error(`LLM scoring failed (${detail}). The key is set — the model reply could not be turned into clips.`);
}
