import { captionLinesForRange } from "@/lib/agent/compose";
import { heuristicCandidates } from "@/lib/agent/heuristic";
import { RUBRIC } from "@/lib/agent/rubric";
import { buildSegments, fit, TARGET_MAX_S, TARGET_MIN_S, totalDuration } from "@/lib/agent/story";
import { timedScript, type TranscriptResult } from "@/lib/agent/transcript";
import { hasLlm } from "@/lib/config";
import { completeJson } from "@/lib/llm/complete";
import { weightedScore } from "@/lib/format";
import type { ClipCandidate, Niche, ScoreBreakdown, WordTiming } from "@/lib/agent/types";

/** What the user has already turned down, so the model stops offering it. */
export type AvoidedClip = { start: number; end: number; topic?: string; hook?: string };

function fmtClock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Left to itself the model returns the same story every time — it is scoring
 * the same transcript against the same rubric. Naming the rejected spans is
 * what makes a rescan produce a genuinely different clip rather than the last
 * one with the wording changed.
 */
function avoidNote(avoid: AvoidedClip[]) {
  if (!avoid.length) return undefined;
  const lines = avoid
    .map((clip) => {
      const label = clip.topic || clip.hook || "an earlier pick";
      return `- "${label}" (${fmtClock(clip.start)}–${fmtClock(clip.end)})`;
    })
    .join("\n");
  return `You already proposed ${avoid.length === 1 ? "this clip" : "these clips"} from this transcript and the user turned ${avoid.length === 1 ? "it" : "them"} down:\n${lines}\n\nPick a genuinely different moment: a different topic, from a different stretch of the tape. Do not return segments that overlap the time ranges above, and do not re-tell the same point in new words. If the strongest remaining option is weaker than what you already offered, return it anyway and score it honestly.`;
}

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

/**
 * The answer's shape, enforced rather than requested.
 *
 * Mirrors the closing block of RUBRIC. Every key is required and
 * additionalProperties is off, because that is what OpenAI's strict mode
 * demands — and because the field this exists to protect is `endQuote`: under
 * plain JSON mode an answer that omitted it was still valid JSON, so the
 * segment quietly lost its closing anchor and the cut fell back to the clock.
 */
const CLIP_SCHEMA = {
  name: "clip",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["topic", "hook", "whyItClips", "scores", "segments"],
    properties: {
      topic: { type: "string" },
      hook: { type: "string" },
      whyItClips: { type: "string" },
      scores: {
        type: "object",
        additionalProperties: false,
        required: ["hook", "emotion", "selfContained", "quotability", "payoff"],
        properties: {
          hook: { type: "number" },
          emotion: { type: "number" },
          selfContained: { type: "number" },
          quotability: { type: "number" },
          payoff: { type: "number" },
        },
      },
      segments: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["start", "end", "startQuote", "endQuote", "role"],
          properties: {
            start: { type: "number" },
            end: { type: "number" },
            startQuote: { type: "string" },
            endQuote: { type: "string" },
            role: { type: "string", enum: ["setup", "beat", "turn", "payoff"] },
          },
        },
      },
    },
  },
} as const;

async function scoreWithLlm(
  transcript: TranscriptResult,
  niche: Niche,
  extra?: string,
  /** Last attempt: take what we can get rather than leaving the user nothing. */
  lastChance = false,
): Promise<{ candidates: ClipCandidate[]; model: string; tokens: number }> {
  const script = timedScript(transcript.segments);
  const { text, tokens, model } = await completeJson({
    // The rubric already closes with the shape it wants. The line that used to
    // sit here advertised a different one — a `candidates` array — and the two
    // disagreed in the same system message.
    system: RUBRIC,
    user: extra ? `${extra}\n\nNiche: ${niche}\n\nTranscript:\n${script}` : `Niche: ${niche}\n\nTranscript:\n${script}`,
    schema: CLIP_SCHEMA as unknown as { name: string; schema: Record<string, unknown> },
    // Copying words out of a transcript exactly is not a creative task, and a
    // paraphrased quote is one that cannot be found. Retries warm up so a
    // rejected answer actually differs from the one before it.
    temperature: extra ? 0.3 : 0,
  });
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("LLM returned invalid JSON");
  }
  const candidates = toStory(parsed, transcript.words);
  if (!candidates.length) throw new Error("LLM returned no usable segments");
  // Length is enforced by sending the measurement back to the model, not by
  // trimming: every span ends where a sentence ends, and shaving seconds off
  // that end is precisely what made assembled clips cut mid-thought.
  const segments = candidates[0].segments ?? [];
  const seconds = totalDuration(segments);
  // Deliberately wider than the 50-60s brief. Asking again for length costs
  // story: the model answers "too long" by dropping beats, so a corrected clip
  // arrives as two fragments where the first answer had a full arc. A 68s clip
  // with a setup and a payoff beats a 55s clip with neither.
  if (seconds < TARGET_MIN_S - 6 || seconds > TARGET_MAX_S + 12) {
    if (!lastChance) {
      const each = segments.map((s) => `${Math.round(s.end - s.start)}s`).join(" + ");
      throw new Error(
        `your segments measured ${each} = ${Math.round(seconds)}s total, but the clip must be ${TARGET_MIN_S}-${TARGET_MAX_S}s`,
      );
    }
    // Out of attempts. A long clip with its arc intact beats an error message,
    // so drop a beat here rather than returning nothing — the one place trimming
    // is the lesser evil, and `fit` protects the setup, turn and payoff.
    console.warn(`[diag] fit last-resort at ${Math.round(seconds)}s after 3 attempts`);
    candidates[0].segments = fit(segments);
    const kept = candidates[0].segments;
    if (kept.length) {
      candidates[0].start = kept[0].start;
      candidates[0].end = kept[kept.length - 1].end;
    }
  }
  return { candidates, model, tokens };
}

function blameKey(message: string) {
  return /401|403|invalid api key|incorrect api key|LLM_API_KEY missing|authentication/i.test(message);
}

export async function scoreTranscript(
  transcript: TranscriptResult,
  niche: Niche,
  opts?: { avoid?: AvoidedClip[] },
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
  const avoid = avoidNote(opts?.avoid ?? []);
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const correction =
        attempt === 0
          ? undefined
          : `Your previous answer was rejected: ${last instanceof Error ? last.message : "bad shape"}.\n\nThe span kept is from startQuote to endQuote — the numbers are only hints, so quoting a later endQuote is what makes a segment longer and quoting an earlier one is what makes it shorter. Keep every segment ending on a finished thought. Return the same JSON shape, with 3-6 chronological segments of 8-20 seconds each.`;
      // A shape correction and a "not that one again" both belong in the same
      // turn; dropping either loses the constraint it was carrying.
      const extra = [avoid, correction].filter(Boolean).join("\n\n") || undefined;
      const { candidates, model, tokens } = await scoreWithLlm(
        transcript,
        niche,
        extra,
        attempt === 2,
      );
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
