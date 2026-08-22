import { RUBRIC_VERSION, hasLlm } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  AnalysisResult,
  CaptionLine,
  CaptionPreset,
  ClipCandidate,
  ClipRender,
  DiscoveryItem,
  GameplayTrack,
  Niche,
  Platform,
  VideoMeta,
} from "@/lib/agent/types";
import type { TranscriptResult } from "@/lib/agent/transcript";

async function writeClient() {
  return createAdminClient() ?? (await createClient());
}

function asVideo(row: {
  video_id: string;
  title: string;
  channel: string;
  duration_s: number;
  thumbnail_url: string;
  published_at: string | null;
  chapters: VideoMeta["chapters"] | null;
  captions_available: boolean | null;
  view_count?: number | null;
  channel_id?: string | null;
  description?: string | null;
}): VideoMeta {
  return {
    videoId: row.video_id,
    title: row.title,
    channel: row.channel,
    durationS: row.duration_s,
    thumbnailUrl: row.thumbnail_url,
    publishedAt: row.published_at ?? "",
    chapters: row.chapters ?? undefined,
    captionsAvailable: row.captions_available !== false,
    viewCount: row.view_count ?? undefined,
    channelId: row.channel_id ?? undefined,
    description: row.description ?? undefined,
  };
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

export async function readVideoCache(videoId: string): Promise<VideoMeta | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.from("video_cache").select("*").eq("video_id", videoId).maybeSingle();
  if (!data) return null;
  return asVideo(data);
}

export async function writeVideoCache(video: VideoMeta): Promise<void> {
  const supabase = await writeClient();
  if (!supabase) return;
  await supabase.from("video_cache").upsert({
    video_id: video.videoId,
    title: video.title,
    channel: video.channel,
    duration_s: video.durationS,
    thumbnail_url: video.thumbnailUrl,
    published_at: video.publishedAt || null,
    chapters: video.chapters ?? null,
    captions_available: video.captionsAvailable,
    view_count: video.viewCount ?? null,
    channel_id: video.channelId ?? null,
    description: video.description ?? null,
    fetched_at: new Date().toISOString(),
  });
}

export async function readTranscriptCache(videoId: string): Promise<TranscriptResult | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("transcript_cache")
    .select("*")
    .eq("video_id", videoId)
    .maybeSingle();
  if (!data) return null;
  if (data.source === "none" || !(data.words ?? []).length) return null;
  const words = data.words ?? [];
  const segments = data.segments ?? [];
  if (!words.length) return null;
  return {
    segments,
    words,
    language: data.language || "en",
    source: data.source === "whisper" ? "whisper" : "captions",
  };
}

export async function writeTranscriptCache(videoId: string, transcript: TranscriptResult): Promise<void> {
  const supabase = await writeClient();
  if (!supabase) return;
  await supabase.from("transcript_cache").upsert({
    video_id: videoId,
    language: transcript.language,
    segments: transcript.segments,
    words: transcript.words,
    source: transcript.source,
    fetched_at: new Date().toISOString(),
  });
}

export async function readAnalysisCache(videoId: string): Promise<AnalysisResult | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("analysis_cache")
    .select("*")
    .eq("video_id", videoId)
    .eq("rubric_version", RUBRIC_VERSION)
    .maybeSingle();
  if (!data?.candidates) return null;
  const candidates = data.candidates as AnalysisResult["candidates"];
  if (candidates[0]?.id === "nc-1" || candidates[0]?.hook?.startsWith("No transcript")) {
    return null;
  }
  const source = data.source === "llm" || data.source === "heuristic" ? data.source : null;
  if (hasLlm() && (source === "heuristic" || candidates[0]?.id?.startsWith("h-"))) {
    return null;
  }
  const video = (data.video as VideoMeta | null) ?? (await readVideoCache(videoId));
  if (!video) return null;
  return {
    video,
    candidates: data.candidates,
    events: data.events ?? [],
    scoreSource: source ?? undefined,
  };
}

export async function writeAnalysisCache(
  videoId: string,
  result: AnalysisResult,
  extra?: { niche?: Niche; model?: string; source?: "llm" | "heuristic"; tokens?: number },
): Promise<void> {
  const supabase = await writeClient();
  if (!supabase) return;
  await supabase.from("analysis_cache").upsert(
    {
      video_id: videoId,
      rubric_version: RUBRIC_VERSION,
      niche: extra?.niche ?? null,
      candidates: result.candidates,
      events: result.events,
      video: result.video,
      model: extra?.model ?? null,
      source: extra?.source ?? null,
      tokens: extra?.tokens ?? 0,
    },
    { onConflict: "video_id,rubric_version" },
  );
}

export function asDiscoveryItem(row: {
  id?: string;
  video_id?: string;
  niche: Niche;
  score: number;
  hook: string;
  why_it_clips: string;
  estimated_clip_count: number;
  platforms: Platform[] | null;
  video: VideoMeta | null;
  llm_rationale?: string | null;
}): DiscoveryItem | null {
  if (!row.video) return null;
  return {
    id: (row.id as string) || `${row.niche}-${row.video_id}`,
    video: row.video,
    niche: row.niche,
    score: row.score,
    hook: row.hook,
    whyItClips: row.why_it_clips,
    estimatedClipCount: row.estimated_clip_count,
    platforms: (row.platforms?.length ? row.platforms : ["youtube"]) as Platform[],
    llmRationale: row.llm_rationale || undefined,
  };
}

export async function upsertDiscoveryItems(
  items: DiscoveryItem[],
  extra?: { searchQuery?: string },
): Promise<void> {
  const supabase = await writeClient();
  if (!supabase || !items.length) return;
  const today = todayStamp();
  await supabase.from("discovery_cache").upsert(
    items.map((item) => ({
      niche: item.niche,
      for_date: today,
      video_id: item.video.videoId,
      score: item.score,
      why_it_clips: item.whyItClips,
      hook: item.hook,
      video: item.video,
      estimated_clip_count: item.estimatedClipCount,
      platforms: item.platforms,
      view_count: item.video.viewCount ?? null,
      channel_id: item.video.channelId ?? null,
      search_query: extra?.searchQuery ?? null,
      llm_rationale: item.llmRationale ?? "",
    })),
    { onConflict: "niche,for_date,video_id" },
  );
}

export async function readDiscoveryCache(niche?: Niche): Promise<DiscoveryItem[]> {
  const supabase = (await createClient()) ?? createAdminClient();
  if (!supabase) return [];
  const today = todayStamp();
  let query = supabase.from("discovery_cache").select("*").eq("for_date", today);
  if (niche) query = query.eq("niche", niche);
  const { data } = await query.order("score", { ascending: false });
  return (data ?? [])
    .map((row) => asDiscoveryItem(row as Parameters<typeof asDiscoveryItem>[0]))
    .filter((item): item is DiscoveryItem => Boolean(item));
}

export async function replaceUserFeed(userId: string, items: DiscoveryItem[]): Promise<void> {
  const supabase = await writeClient();
  if (!supabase) return;
  const today = todayStamp();
  await supabase.from("user_feed").delete().eq("user_id", userId).eq("for_date", today);
  if (!items.length) return;
  await supabase.from("user_feed").insert(
    items.map((item) => ({
      user_id: userId,
      for_date: today,
      video_id: item.video.videoId,
      niche: item.niche,
      score: item.score,
      hook: item.hook,
      why_it_clips: item.whyItClips,
      llm_rationale: item.llmRationale ?? "",
      video: item.video,
      estimated_clip_count: item.estimatedClipCount,
      platforms: item.platforms,
    })),
  );
}

export async function copyNicheFeedToUser(userId: string, niche: Niche): Promise<DiscoveryItem[]> {
  const items = await readDiscoveryCache(niche);
  if (items.length) await replaceUserFeed(userId, items);
  return items;
}

export async function readUserFeed(userId: string): Promise<DiscoveryItem[]> {
  const supabase = (await createClient()) ?? createAdminClient();
  if (!supabase) return [];
  const today = todayStamp();
  const { data } = await supabase
    .from("user_feed")
    .select("*")
    .eq("user_id", userId)
    .eq("for_date", today)
    .order("score", { ascending: false });
  return (data ?? [])
    .map((row) => asDiscoveryItem(row as Parameters<typeof asDiscoveryItem>[0]))
    .filter((item): item is DiscoveryItem => Boolean(item));
}

export async function readQuotaUsed(): Promise<number> {
  const supabase = await writeClient();
  if (!supabase) return 0;
  const { data } = await supabase
    .from("discovery_quota")
    .select("search_count")
    .eq("day", todayStamp())
    .maybeSingle();
  return data?.search_count ?? 0;
}

export async function addQuotaUsed(count: number): Promise<number> {
  if (count <= 0) return readQuotaUsed();
  const supabase = await writeClient();
  if (!supabase) return 0;
  const used = await readQuotaUsed();
  const next = used + count;
  await supabase.from("discovery_quota").upsert(
    { day: todayStamp(), search_count: next },
    { onConflict: "day" },
  );
  return next;
}

export async function listOnboardedProfiles(): Promise<Array<{ id: string; niche: Niche }>> {
  const supabase = await writeClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("profiles")
    .select("id, niche")
    .eq("onboarding_complete", true);
  return (data ?? []).map((row) => ({ id: row.id as string, niche: row.niche as Niche }));
}

export async function insertClipRender(input: {
  userId: string;
  videoId: string;
  jobId?: string;
  start: number;
  end: number;
  gameplay?: GameplayTrack;
  captionPreset?: CaptionPreset;
  captionLines?: CaptionLine[];
  moment?: ClipCandidate;
}): Promise<string | null> {
  const supabase = await writeClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("clip_renders")
    .insert({
      user_id: input.userId,
      video_id: input.videoId,
      job_id: input.jobId ?? null,
      status: "queued",
      progress: 0,
      start_s: input.start,
      end_s: input.end,
      gameplay: input.gameplay ?? "none",
      caption_preset: input.captionPreset ?? "hormozi",
      caption_lines: input.captionLines ?? [],
      moment: input.moment ?? null,
    })
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id as string;
}

function asRender(row: {
  id: string;
  job_id?: string | null;
  video_id: string;
  status: ClipRender["status"];
  progress: number;
  error?: string | null;
  output_path?: string | null;
  duration_s?: number | null;
  start_s?: number | null;
  end_s?: number | null;
  created_at: string;
  finished_at?: string | null;
  moment?: ClipCandidate | null;
}): ClipRender {
  return {
    id: row.id,
    jobId: row.job_id,
    videoId: row.video_id,
    status: row.status,
    progress: row.progress ?? 0,
    error: row.error,
    outputPath: row.output_path,
    durationS: row.duration_s,
    startS: row.start_s,
    endS: row.end_s,
    createdAt: row.created_at,
    finishedAt: row.finished_at,
    hook: row.moment?.hook,
  };
}

export async function getClipRenders(userId: string): Promise<ClipRender[]> {
  const supabase = (await createClient()) ?? createAdminClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("clip_renders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(40);
  return (data ?? []).map((row) => asRender(row as Parameters<typeof asRender>[0]));
}

export async function getClipRender(userId: string, id: string): Promise<ClipRender | null> {
  const supabase = (await createClient()) ?? createAdminClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("clip_renders")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return asRender(data as Parameters<typeof asRender>[0]);
}

export async function signedClipUrl(path: string): Promise<string | null> {
  const supabase = createAdminClient() ?? (await createClient());
  if (!supabase) return null;
  const { data } = await supabase.storage.from("clips").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
