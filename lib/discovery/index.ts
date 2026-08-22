import type { DiscoveryItem, Niche, Platform } from "@/lib/agent/types";
import { hasServiceRole, hasYouTubeKey } from "@/lib/config";
import { planSearchQueries } from "@/lib/discovery/queries";
import { rankVideoGroups, rankVideos, toDiscoveryItem } from "@/lib/discovery/rank";
import {
  addQuotaUsed,
  copyNicheFeedToUser,
  listOnboardedProfiles,
  readDiscoveryCache,
  readQuotaUsed,
  readUserFeed,
  replaceUserFeed,
  upsertDiscoveryItems,
  writeVideoCache,
} from "@/lib/supabase/cache";
import { hydrateVideos, searchLongform } from "@/lib/youtube/meta";

export { NICHE_QUERIES } from "@/lib/discovery/queries";

export const SEARCH_CAP = 80;

async function collectVideos(queries: string[], remaining: number) {
  const ids: string[] = [];
  const seen = new Set<string>();
  let searches = 0;
  for (const query of queries) {
    if (searches >= remaining) break;
    let hits = await searchLongform(query, 8);
    searches += 1;
    if (hits.length < 3 && searches < remaining) {
      hits = await searchLongform(query, 8, { publishedAfterDays: 45 });
      searches += 1;
    }
    for (const hit of hits) {
      if (seen.has(hit.videoId)) continue;
      if (/#shorts/i.test(hit.title)) continue;
      seen.add(hit.videoId);
      ids.push(hit.videoId);
    }
  }
  const videos = await hydrateVideos(ids);
  return { videos, searches };
}

export async function refreshNicheFeed(
  niche: Niche,
  opts?: { formats?: string[]; platforms?: Platform[] },
): Promise<{ items: DiscoveryItem[]; searches: number }> {
  const remaining = Math.max(0, SEARCH_CAP - (await readQuotaUsed()));
  if (!hasYouTubeKey() || remaining <= 0) {
    return { items: await readDiscoveryCache(niche), searches: 0 };
  }

  const planned = await planSearchQueries({
    niches: [niche],
    formats: opts?.formats,
    platforms: opts?.platforms,
  });
  const queries = planned[niche] ?? [];
  const { videos, searches } = await collectVideos(queries, remaining);
  await addQuotaUsed(searches);
  await Promise.all(videos.map((video) => writeVideoCache(video)));

  const ranked = await rankVideos({
    niche,
    videos,
    formats: opts?.formats,
    platforms: opts?.platforms,
  });
  const platforms = opts?.platforms?.length ? opts.platforms : (["youtube", "tiktok"] as Platform[]);
  const items = videos
    .map((video) => {
      const row = ranked.get(video.videoId);
      if (!row) return null;
      return toDiscoveryItem(video, niche, row, platforms, `${niche}-${video.videoId}`);
    })
    .filter((item): item is DiscoveryItem => Boolean(item))
    .sort((a, b) => b.score - a.score);

  await upsertDiscoveryItems(items, { searchQuery: queries[0] });
  return { items, searches };
}

export async function refreshDiscovery(niches: Niche[]) {
  if (!hasYouTubeKey()) {
    return { ok: false, reason: "no_youtube_key", searches: 0, items: 0 };
  }
  if (!hasServiceRole()) {
    return { ok: false, reason: "no_service_role", searches: 0, items: 0 };
  }

  let searches = 0;
  let items = 0;
  const byNiche = new Map<Niche, DiscoveryItem[]>();
  const groups: Array<{ niche: Niche; videos: Awaited<ReturnType<typeof collectVideos>>["videos"] }> = [];
  const queryByNiche = new Map<Niche, string>();

  const planned = await planSearchQueries({ niches });
  for (const niche of niches) {
    const remaining = Math.max(0, SEARCH_CAP - (await readQuotaUsed()));
    if (remaining <= 0) break;
    const queries = (planned[niche] ?? []).slice(0, 1);
    const collected = await collectVideos(queries, remaining);
    searches += collected.searches;
    await addQuotaUsed(collected.searches);
    await Promise.all(collected.videos.map((video) => writeVideoCache(video)));
    groups.push({ niche, videos: collected.videos });
    if (queries[0]) queryByNiche.set(niche, queries[0]);
  }

  const ranked = await rankVideoGroups(groups);
  for (const group of groups) {
    const feed = group.videos
      .map((video) => {
        const row = ranked.get(`${group.niche}:${video.videoId}`);
        if (!row) return null;
        return toDiscoveryItem(video, group.niche, row, ["youtube", "tiktok"], `${group.niche}-${video.videoId}`);
      })
      .filter((item): item is DiscoveryItem => Boolean(item))
      .sort((a, b) => b.score - a.score);
    byNiche.set(group.niche, feed);
    items += feed.length;
    await upsertDiscoveryItems(feed, { searchQuery: queryByNiche.get(group.niche) });
  }

  const profiles = await listOnboardedProfiles();
  for (const profile of profiles) {
    const feed = byNiche.get(profile.niche) ?? (await readDiscoveryCache(profile.niche));
    if (feed.length) await replaceUserFeed(profile.id, feed);
  }

  console.info("[discovery]", { searches, items, cap: SEARCH_CAP });
  return { ok: true, searches, items, used: await readQuotaUsed() };
}

export async function bootstrapUserFeed(input: {
  userId: string;
  niche: Niche;
  formats?: string[];
  platforms?: Platform[];
}) {
  const { items, searches } = await refreshNicheFeed(input.niche, {
    formats: input.formats,
    platforms: input.platforms,
  });
  if (items.length) await replaceUserFeed(input.userId, items);
  else await copyNicheFeedToUser(input.userId, input.niche);
  return { ok: true, items: items.length, searches };
}

export async function readDiscovery(opts?: {
  niche?: Niche;
  userId?: string;
}): Promise<DiscoveryItem[]> {
  if (opts?.userId) {
    const mine = await readUserFeed(opts.userId);
    if (mine.length) {
      return opts.niche ? mine.filter((item) => item.niche === opts.niche) : mine;
    }
    if (opts.niche) {
      const copied = await copyNicheFeedToUser(opts.userId, opts.niche);
      if (copied.length) return copied;
    }
  }
  return readDiscoveryCache(opts?.niche);
}
