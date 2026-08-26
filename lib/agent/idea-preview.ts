import type { ScoreBreakdown } from "@/lib/agent/types";

export type IdeaMoment = {
  /** Seconds into the source video. */
  at: number;
  label: string;
  why: string;
};

export type IdeaPreview = {
  source: "llm" | "heuristic";
  angle: string;
  audience: string;
  moments: IdeaMoment[];
  hooks: string[];
  scores: ScoreBreakdown;
  watchOut: string;
};

export type PreviewInput = {
  videoId: string;
  title: string;
  channel: string;
  durationS: number;
  description?: string;
  niche: string;
  hook?: string;
  whyItClips?: string;
  score: number;
};

/**
 * A small deterministic PRNG keyed off the video id. The fallback preview has
 * to be stable: an idea that reshuffles its own suggested moments every time
 * the sheet reopens reads as noise, not analysis.
 */
function seeded(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 1000) / 1000;
  };
}

function spread(score: number, rand: () => number): ScoreBreakdown {
  const jitter = (weight: number) =>
    Math.max(20, Math.min(99, Math.round(score + (rand() - 0.5) * weight)));
  return {
    hook: jitter(18),
    emotion: jitter(24),
    selfContained: jitter(20),
    quotability: jitter(22),
    payoff: jitter(16),
  };
}

/**
 * What the sheet shows when there is no model key configured. Everything here
 * is derived from facts we already have — the duration, the score, the reason
 * discovery surfaced it — rather than invented detail dressed up as analysis.
 */
export function heuristicPreview(input: PreviewInput): IdeaPreview {
  const rand = seeded(input.videoId);
  const duration = Math.max(120, input.durationS || 1800);

  // Longform front-loads its hook and saves the payoff; sample where the
  // quotable material usually sits rather than at even intervals.
  const marks = [0.06, 0.31, 0.58, 0.79];
  const moments: IdeaMoment[] = marks.slice(0, input.score >= 75 ? 4 : 3).map((f, i) => ({
    at: Math.round(duration * (f + (rand() - 0.5) * 0.04)),
    label: ["The cold open", "First real claim", "The turn", "The payoff"][i],
    why: [
      "Openings are already written to stop a scroll — this is usually the cheapest cut on the tape.",
      "The point where the argument stops being setup and starts being a position worth arguing with.",
      "Where the conversation changes direction. Reaction shots and interruptions live here.",
      "The line the whole thing was building to. Works as a standalone if the setup is short enough.",
    ][i],
  }));

  const subject = input.title.replace(/\s*[|·—-]\s*.*$/, "").trim();

  return {
    source: "heuristic",
    angle:
      input.whyItClips ||
      `A ${Math.round(duration / 60)}-minute ${input.niche} video from ${input.channel}. Long enough that the strongest minute is buried, which is exactly the case clipping is for.`,
    audience: `People who already follow ${input.niche} content and scroll Shorts and Reels — they will recognise ${input.channel} without needing the context explained.`,
    moments,
    hooks: [
      input.hook || subject,
      `The part of "${subject}" nobody quotes`,
      `${input.channel} on what most people get wrong`,
    ].filter(Boolean),
    scores: spread(input.score, rand),
    watchOut:
      "This read comes from the title and description only. Cut the clip and Clipmuse reads the whole transcript.",
  };
}

const SYSTEM = `You are a short-form video editor who has cut hundreds of viral Shorts and TikToks out of longform podcasts, interviews and talks.
You are given only a video's metadata — not its transcript. Be concrete and honest about that limit; never invent quotes or claim to know what was said.
Respond with JSON matching exactly:
{
  "angle": "2-3 sentences on the clipping angle: what this video is really about and where the short-form value sits",
  "audience": "1 sentence on who a clip from this lands with",
  "moments": [{"at": <seconds into the video, integer>, "label": "<4-6 words>", "why": "<1 sentence>"}],
  "hooks": ["<caption hook under 60 chars>", "...", "..."],
  "scores": {"hook": 0-100, "emotion": 0-100, "selfContained": 0-100, "quotability": 0-100, "payoff": 0-100},
  "watchOut": "1 sentence on the risk of clipping this one"
}
Give 3-4 moments, spread across the duration, and 3 hooks.`;

export function buildPreviewPrompt(input: PreviewInput) {
  return [
    `Title: ${input.title}`,
    `Channel: ${input.channel}`,
    `Duration: ${Math.round(input.durationS / 60)} minutes (${input.durationS} seconds)`,
    `Niche: ${input.niche}`,
    input.description ? `Description: ${input.description.slice(0, 900)}` : "",
    input.whyItClips ? `Why discovery surfaced it: ${input.whyItClips}` : "",
    `Discovery score: ${input.score}/100`,
  ]
    .filter(Boolean)
    .join("\n");
}

export const PREVIEW_SYSTEM = SYSTEM;

/** Trusts nothing from the model: clamps, trims and fills every field. */
export function coercePreview(raw: unknown, input: PreviewInput): IdeaPreview {
  const fallback = heuristicPreview(input);
  if (!raw || typeof raw !== "object") return fallback;
  const data = raw as Record<string, unknown>;

  const clamp = (v: unknown, dflt: number) =>
    typeof v === "number" && Number.isFinite(v)
      ? Math.max(0, Math.min(100, Math.round(v)))
      : dflt;

  const rawScores = (data.scores ?? {}) as Record<string, unknown>;
  const rawMoments = Array.isArray(data.moments) ? data.moments : [];

  const moments = rawMoments
    .map((m) => {
      const item = (m ?? {}) as Record<string, unknown>;
      const at = typeof item.at === "number" ? Math.round(item.at) : NaN;
      if (!Number.isFinite(at) || at < 0 || at > input.durationS) return null;
      return {
        at,
        label: String(item.label ?? "").slice(0, 60) || "A moment worth cutting",
        why: String(item.why ?? "").slice(0, 240),
      };
    })
    .filter((m): m is IdeaMoment => m !== null)
    .slice(0, 4);

  const hooks = (Array.isArray(data.hooks) ? data.hooks : [])
    .map((h) => String(h ?? "").slice(0, 90))
    .filter(Boolean)
    .slice(0, 3);

  return {
    source: "llm",
    angle: String(data.angle ?? "").slice(0, 600) || fallback.angle,
    audience: String(data.audience ?? "").slice(0, 300) || fallback.audience,
    moments: moments.length ? moments : fallback.moments,
    hooks: hooks.length ? hooks : fallback.hooks,
    scores: {
      hook: clamp(rawScores.hook, fallback.scores.hook),
      emotion: clamp(rawScores.emotion, fallback.scores.emotion),
      selfContained: clamp(rawScores.selfContained, fallback.scores.selfContained),
      quotability: clamp(rawScores.quotability, fallback.scores.quotability),
      payoff: clamp(rawScores.payoff, fallback.scores.payoff),
    },
    watchOut: String(data.watchOut ?? "").slice(0, 300) || fallback.watchOut,
  };
}
