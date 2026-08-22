import type { DiscoveryItem, Niche } from "@/lib/agent/types";
import { hasYouTubeKey } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { writeVideoCache } from "@/lib/supabase/cache";
import { hydrateVideos, searchLongform } from "@/lib/youtube/meta";

export const NICHE_QUERIES: Record<Niche, string> = {
  finance: "personal finance podcast money advice",
  "true-crime": "true crime documentary interview",
  podcasts: "longform podcast interview",
  sports: "sports commentary analysis podcast",
  fitness: "fitness coaching podcast",
  faith: "sermon testimony church",
  comedy: "comedy podcast interview",
  tech: "tech podcast startup interview",
  politics: "political interview debate",
  storytime: "storytime podcast personal story",
  "self-improvement": "self improvement podcast habits",
  gaming: "gaming podcast interview",
};

const SEARCH_CAP = 80;

export async function refreshDiscovery(niches: Niche[]) {
  if (!hasYouTubeKey()) {
    return { ok: false, reason: "no_youtube_key", searches: 0, items: 0 };
  }
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  let used = 0;
  if (supabase) {
    const { data } = await supabase
      .from("discovery_quota")
      .select("search_count")
      .eq("day", today)
      .maybeSingle();
    used = data?.search_count ?? 0;
  }

  let searches = 0;
  let items = 0;
  const written: DiscoveryItem[] = [];

  for (const niche of niches) {
    if (used + searches >= SEARCH_CAP) break;
    const hits = await searchLongform(NICHE_QUERIES[niche], 5);
    searches += 1;
    if (!hits.length) continue;
    const videos = await hydrateVideos(hits.map((h) => h.videoId));
    for (const video of videos) {
      await writeVideoCache(video);
      const hook = video.title.split(/[|:–—]/)[0]?.trim() || video.title;
      const score = Math.min(92, 58 + Math.min(video.durationS / 600, 20));
      const row: DiscoveryItem = {
        id: `${niche}-${today}-${video.videoId}`,
        video,
        niche,
        score: Math.round(score),
        hook,
        whyItClips: `Longform from ${video.channel} that fits ${niche.replace("-", " ")}.`,
        estimatedClipCount: Math.max(2, Math.min(8, Math.round(video.durationS / 900))),
        platforms: ["youtube", "tiktok"],
      };
      written.push(row);
      items += 1;
      if (supabase) {
        await supabase.from("discovery_cache").upsert(
          {
            niche,
            for_date: today,
            video_id: video.videoId,
            score: row.score,
            why_it_clips: row.whyItClips,
            hook: row.hook,
            video,
            estimated_clip_count: row.estimatedClipCount,
            platforms: row.platforms,
          },
          { onConflict: "niche,for_date,video_id" },
        );
      }
    }
  }

  if (supabase) {
    await supabase.from("discovery_quota").upsert(
      {
        day: today,
        search_count: used + searches,
      },
      { onConflict: "day" },
    );
  }

  console.info("[discovery]", { searches, used: used + searches, items, cap: SEARCH_CAP });
  return { ok: true, searches, items, used: used + searches };
}

export async function readDiscovery(niche?: Niche): Promise<DiscoveryItem[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const today = new Date().toISOString().slice(0, 10);
  let query = supabase.from("discovery_cache").select("*").eq("for_date", today);
  if (niche) query = query.eq("niche", niche);
  const { data } = await query.order("score", { ascending: false });
  return (data ?? []).map((row) => ({
    id: row.id as string,
    video: row.video as DiscoveryItem["video"],
    niche: row.niche as Niche,
    score: row.score as number,
    hook: row.hook as string,
    whyItClips: row.why_it_clips as string,
    estimatedClipCount: row.estimated_clip_count as number,
    platforms: (row.platforms ?? ["youtube"]) as DiscoveryItem["platforms"],
  }));
}
