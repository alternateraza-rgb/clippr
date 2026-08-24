import { captionLinesForRange } from "@/lib/agent/compose";
import { heuristicCandidates } from "@/lib/agent/heuristic";
import { RUBRIC } from "@/lib/agent/rubric";
import { buildSegments, TARGET_MIN_S, totalDuration } from "@/lib/agent/story";
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

/**
 * Models answer "score 0-100" on a 0-10 scale often enough that a clip scoring
 * 8 out of 100 is a parsing artefact, not a judgement. If every score would be
 * a plausible 0-10 rating, read it as one.
 */
function normalizeScores(scores: ScoreBreakdown): ScoreBreakdown {
  const values = Object.values(scores);
  if (!values.every((v) => v > 0 && v <= 10)) return scores;
  return Object.fromEntries(
    Object.entries(scores).map(([key, value]) => [key, Math.min(100, value * 10)]),
  ) as ScoreBreakdown;
}

function clampScore(n: unknown) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 50;
  return Math.max(0, Math.min(100, Math.round(v)));
}

/**
 * One clip, assembled from the spans the model chose.
 *
 * Everything the model says about timing is treated as a suggestion — the
 * segments are re-anchored to the transcript before they become a clip.
 */
function toStory(raw: unknown, words: WordTiming[]): ClipCandidate[] {
  const root = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  // Models wrap the answer differently depending on the day.
  const story = (Array.isArray(root.candidates) && root.candidates[0] && typeof root.candidates[0] === "object"
    ? (root.candidates[0] as Record<string, unknown>)
    : root) as Record<string, unknown>;

  const segments = buildSegments(story.segments ?? story.moments ?? story.spans, words);
  if (!segments.length) return [];

  const nested = (story.scores && typeof story.scores === "object" ? story.scores : story) as Record<
    string,
    unknown
  >;
  const scores = normalizeScores({
    hook: clampScore(nested.hook),
    emotion: clampScore(nested.emotion),
    selfContained: clampScore(nested.selfContained ?? nested.self_contained),
    quotability: clampScore(nested.quotability ?? nested.quotable),
    payoff: clampScore(nested.payoff),
  });

  const start = segments[0].start;
  const end = segments[segments.length - 1].end;

  return [
    {
      id: "story-1",
      start,
      end,
      hook: String(story.hook || segments[0].quote || "").slice(0, 220),
      whyItClips: String(story.whyItClips || story.why_it_clips || story.reason || "").slice(0, 500),
      topic: String(story.topic || story.title || "").slice(0, 200),
      segments,
      score: weightedScore(scores),
      scores,
      // Captions are regenerated from the assembled audio at render time; these
      // only carry the first segment so the export payload is not empty.
      captionLines: captionLinesForRange(words, start, segments[0].end),
    },
  ];
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
  const candidates = toStory(parsed, transcript.words);
  if (!candidates.length) throw new Error("LLM returned no usable segments");
  // A short story is a failed story: the model found moments but not enough of
  // them to carry a topic. Worth one more attempt before shipping it.
  const seconds = totalDuration(candidates[0].segments ?? []);
  if (seconds < TARGET_MIN_S) {
    throw new Error(`Story is only ${Math.round(seconds)}s of tape`);
  }
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
          : `Previous reply was unusable (${last instanceof Error ? last.message : "bad shape"}). Return one JSON object with "topic", "hook", "whyItClips", "scores" and a "segments" array of 3-6 spans in chronological order totalling 50-60 seconds of tape. start and end must be JSON numbers in seconds (522.4), never "8:42", and every segment needs a verbatim "quote" of its opening words.`;
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
