import { env, hasYouTubeKey } from "@/lib/config";
import type { VideoMeta } from "@/lib/agent/types";
import { thumbnailFor } from "@/lib/youtube";

export { parseYouTubeId, thumbnailFor, isYouTubeUrl } from "@/lib/youtube";

export function parseIsoDuration(iso: string) {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (
    Number(match[1] ?? 0) * 3600 +
    Number(match[2] ?? 0) * 60 +
    Number(match[3] ?? 0)
  );
}

type YoutubeVideoItem = {
  id: string;
  snippet?: {
    title?: string;
    channelTitle?: string;
    publishedAt?: string;
    description?: string;
  };
  contentDetails?: { duration?: string };
};

export async function hydrateVideo(videoId: string): Promise<VideoMeta> {
  if (hasYouTubeKey()) {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "snippet,contentDetails");
    url.searchParams.set("id", videoId);
    url.searchParams.set("key", env("YOUTUBE_API_KEY"));
    const res = await fetch(url);
    if (!res.ok) throw new Error(`YouTube videos.list failed (${res.status})`);
    const data = (await res.json()) as { items?: YoutubeVideoItem[] };
    const item = data.items?.[0];
    if (!item) throw new Error("Video unavailable or private.");
    return {
      videoId,
      title: item.snippet?.title ?? "Untitled",
      channel: item.snippet?.channelTitle ?? "Unknown channel",
      durationS: parseIsoDuration(item.contentDetails?.duration ?? ""),
      thumbnailUrl: thumbnailFor(videoId),
      publishedAt: item.snippet?.publishedAt ?? new Date().toISOString(),
      captionsAvailable: true,
    };
  }

  const oembed = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`,
  );
  if (!oembed.ok) throw new Error("Video unavailable or private.");
  const json = (await oembed.json()) as { title?: string; author_name?: string };
  return {
    videoId,
    title: json.title ?? "Untitled",
    channel: json.author_name ?? "YouTube",
    durationS: 0,
    thumbnailUrl: thumbnailFor(videoId),
    publishedAt: new Date().toISOString(),
    captionsAvailable: true,
  };
}

export async function hydrateVideos(ids: string[]): Promise<VideoMeta[]> {
  if (!ids.length) return [];
  if (!hasYouTubeKey()) {
    return Promise.all(ids.map((id) => hydrateVideo(id)));
  }
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "snippet,contentDetails");
  url.searchParams.set("id", ids.join(","));
  url.searchParams.set("key", env("YOUTUBE_API_KEY"));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube videos.list failed (${res.status})`);
  const data = (await res.json()) as { items?: YoutubeVideoItem[] };
  return (data.items ?? []).map((item) => ({
    videoId: item.id,
    title: item.snippet?.title ?? "Untitled",
    channel: item.snippet?.channelTitle ?? "Unknown channel",
    durationS: parseIsoDuration(item.contentDetails?.duration ?? ""),
    thumbnailUrl: thumbnailFor(item.id),
    publishedAt: item.snippet?.publishedAt ?? new Date().toISOString(),
    captionsAvailable: true,
  }));
}

export type SearchHit = { videoId: string; title: string; channel: string };

export async function searchLongform(query: string, maxResults = 6): Promise<SearchHit[]> {
  if (!hasYouTubeKey()) return [];
  const publishedAfter = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("videoDuration", "long");
  url.searchParams.set("order", "viewCount");
  url.searchParams.set("q", query);
  url.searchParams.set("publishedAfter", publishedAfter);
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("key", env("YOUTUBE_API_KEY"));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube search.list failed (${res.status})`);
  const data = (await res.json()) as {
    items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string } }>;
  };
  return (data.items ?? [])
    .map((item) => ({
      videoId: item.id?.videoId ?? "",
      title: item.snippet?.title ?? "",
      channel: item.snippet?.channelTitle ?? "",
    }))
    .filter((hit) => hit.videoId);
}
