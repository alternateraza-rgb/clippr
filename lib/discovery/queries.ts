import type { Niche } from "@/lib/agent/types";
import { hasLlm } from "@/lib/config";
import { completeJson } from "@/lib/llm/complete";

export const NICHE_QUERIES: Record<Niche, string> = {
  finance: "personal finance podcast full episode money advice",
  "true-crime": "true crime documentary interview full",
  podcasts: "longform podcast interview full episode",
  sports: "sports commentary analysis podcast full",
  fitness: "fitness coaching podcast interview full",
  faith: "sermon testimony church full message",
  comedy: "comedy podcast interview full episode",
  tech: "tech podcast startup interview full episode",
  politics: "political interview debate full conversation",
  storytime: "storytime podcast personal story full episode",
  "self-improvement": "self improvement podcast habits full episode",
  gaming: "gaming podcast interview full episode",
};

const PLAN_SYSTEM = `You plan YouTube Data API search.list queries for a clipping studio.
Return JSON: {"niches":[{"niche":"finance","queries":["...","..."]}]}
Rules:
- 2 queries per niche (3 if only one niche is requested).
- Find LONGFORM (podcasts, interviews, documentaries, sermons, commentary). Never Shorts, never trailers, never clips of clips.
- Optimize for clip potential: stories, conflict, specific claims, names, numbers, emotional stakes.
- Put words like podcast, interview, documentary, full episode, sermon in the query.
- Do not mention duration numbers.`;

export async function planSearchQueries(input: {
  niches: Niche[];
  formats?: string[];
  platforms?: string[];
}): Promise<Record<Niche, string[]>> {
  const fallback = Object.fromEntries(
    input.niches.map((niche) => [niche, [NICHE_QUERIES[niche]]]),
  ) as Record<Niche, string[]>;

  if (!hasLlm() || !input.niches.length) return fallback;

  try {
    const { text } = await completeJson({
      system: PLAN_SYSTEM,
      maxTokens: 900,
      user: JSON.stringify({
        niches: input.niches,
        formats: input.formats ?? [],
        platforms: input.platforms ?? [],
      }),
    });
    const parsed = JSON.parse(text) as {
      niches?: Array<{ niche?: string; queries?: string[] }>;
      queries?: string[];
    };
    const out: Partial<Record<Niche, string[]>> = { ...fallback };
    if (parsed.niches?.length) {
      for (const row of parsed.niches) {
        const niche = row.niche as Niche | undefined;
        const queries = (row.queries ?? []).map((q) => q.trim()).filter(Boolean).slice(0, 3);
        if (niche && input.niches.includes(niche) && queries.length) out[niche] = queries;
      }
    } else if (parsed.queries?.length && input.niches.length === 1) {
      out[input.niches[0]] = parsed.queries.map((q) => q.trim()).filter(Boolean).slice(0, 3);
    }
    return out as Record<Niche, string[]>;
  } catch {
    return fallback;
  }
}
