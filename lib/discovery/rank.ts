import type { DiscoveryItem, Niche, Platform, VideoMeta } from "@/lib/agent/types";
import { hasLlm } from "@/lib/config";
import { completeJson } from "@/lib/llm/complete";

const RANK_SYSTEM = `You rank longform YouTube videos for a clipping studio.
Return JSON: {"items":[{"videoId":"...","score":0,"hook":"...","whyItClips":"...","estimatedClipCount":3,"rationale":"..."}]}
Rules:
- score 0-100 is CLIP POTENTIAL, not production quality and not duration. Every video is already 8+ minutes.
- Prefer specific claims, stories, conflict, names, numbers, emotional stakes, quotable lines implied by the title.
- hook = the on-screen sentence a clipper would use. whyItClips = one sentence for the editor.
- estimatedClipCount is 2-8. Skip obvious Shorts recaps and clip compilations (score them under 40).
- Include every videoId you were given. When the user prompt has groups, include niche on each item.`;

type Ranked = {
  videoId: string;
  score: number;
  hook: string;
  whyItClips: string;
  estimatedClipCount: number;
  rationale: string;
};

function heuristicRank(video: VideoMeta, niche: Niche): Ranked {
  const views = video.viewCount ?? 0;
  const viewBoost = Math.min(18, Math.log10(Math.max(views, 10)) * 4);
  const title = video.title.toLowerCase();
  const clippy =
    /(i |we |my |secret|truth|nobody|never|why |how |story|confess|broke|lost|made|killed|found)/.test(
      title,
    )
      ? 12
      : 0;
  const compilation = /(shorts|compilation|best of|top 10|clip)/.test(title) ? -25 : 0;
  const score = Math.max(38, Math.min(92, Math.round(58 + viewBoost + clippy + compilation)));
  const hook = video.title.split(/[|:–—]/)[0]?.trim() || video.title;
  return {
    videoId: video.videoId,
    score,
    hook,
    whyItClips: `Longform from ${video.channel} that fits ${niche.replace("-", " ")}.`,
    estimatedClipCount: Math.max(2, Math.min(8, Math.round(video.durationS / 900))),
    rationale: "heuristic",
  };
}

export async function rankVideos(input: {
  niche: Niche;
  videos: VideoMeta[];
  formats?: string[];
  platforms?: Platform[];
}): Promise<Map<string, Ranked>> {
  const map = new Map<string, Ranked>();
  for (const video of input.videos) {
    map.set(video.videoId, heuristicRank(video, input.niche));
  }
  if (!hasLlm() || !input.videos.length) return map;

  try {
    const { text } = await completeJson({
      system: RANK_SYSTEM,
      maxTokens: 1800,
      user: JSON.stringify({
        niche: input.niche,
        formats: input.formats ?? [],
        platforms: input.platforms ?? [],
        videos: input.videos.map((v) => ({
          videoId: v.videoId,
          title: v.title,
          channel: v.channel,
          durationS: v.durationS,
          viewCount: v.viewCount ?? 0,
          description: (v.description ?? "").slice(0, 280),
        })),
      }),
    });
    const parsed = JSON.parse(text) as { items?: Ranked[] };
    for (const row of parsed.items ?? []) {
      if (!row?.videoId || !map.has(row.videoId)) continue;
      const score = Number(row.score);
      map.set(row.videoId, {
        videoId: row.videoId,
        score: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : map.get(row.videoId)!.score,
        hook: String(row.hook || map.get(row.videoId)!.hook).slice(0, 220),
        whyItClips: String(row.whyItClips || map.get(row.videoId)!.whyItClips).slice(0, 400),
        estimatedClipCount: Math.max(
          2,
          Math.min(8, Number(row.estimatedClipCount) || map.get(row.videoId)!.estimatedClipCount),
        ),
        rationale: String(row.rationale || "llm").slice(0, 400),
      });
    }
  } catch {
    // keep heuristic ranks
  }
  return map;
}

export async function rankVideoGroups(
  groups: Array<{ niche: Niche; videos: VideoMeta[] }>,
): Promise<Map<string, Ranked & { niche: Niche }>> {
  const map = new Map<string, Ranked & { niche: Niche }>();
  for (const group of groups) {
    for (const video of group.videos) {
      map.set(`${group.niche}:${video.videoId}`, {
        ...heuristicRank(video, group.niche),
        niche: group.niche,
      });
    }
  }
  if (!hasLlm() || !groups.some((g) => g.videos.length)) return map;

  try {
    const { text } = await completeJson({
      system: RANK_SYSTEM,
      maxTokens: 3500,
      user: JSON.stringify({
        groups: groups.map((g) => ({
          niche: g.niche,
          videos: g.videos.map((v) => ({
            videoId: v.videoId,
            title: v.title,
            channel: v.channel,
            durationS: v.durationS,
            viewCount: v.viewCount ?? 0,
            description: (v.description ?? "").slice(0, 180),
          })),
        })),
      }),
    });
    const parsed = JSON.parse(text) as {
      items?: Array<Ranked & { niche?: Niche }>;
    };
    for (const row of parsed.items ?? []) {
      if (!row?.videoId) continue;
      const current = row.niche
        ? map.get(`${row.niche}:${row.videoId}`)
        : [...map.values()].find((v) => v.videoId === row.videoId);
      if (!current) continue;
      const score = Number(row.score);
      map.set(`${current.niche}:${row.videoId}`, {
        ...current,
        score: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : current.score,
        hook: String(row.hook || current.hook).slice(0, 220),
        whyItClips: String(row.whyItClips || current.whyItClips).slice(0, 400),
        estimatedClipCount: Math.max(
          2,
          Math.min(8, Number(row.estimatedClipCount) || current.estimatedClipCount),
        ),
        rationale: String(row.rationale || "llm").slice(0, 400),
      });
    }
  } catch {
    // keep heuristic ranks
  }
  return map;
}

export function toDiscoveryItem(
  video: VideoMeta,
  niche: Niche,
  ranked: Ranked,
  platforms: Platform[],
  id: string,
): DiscoveryItem {
  return {
    id,
    video,
    niche,
    score: ranked.score,
    hook: ranked.hook,
    whyItClips: ranked.whyItClips,
    estimatedClipCount: ranked.estimatedClipCount,
    platforms: platforms.length ? platforms : ["youtube", "tiktok"],
    llmRationale: ranked.rationale,
  };
}
