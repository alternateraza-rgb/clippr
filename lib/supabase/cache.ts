import { RUBRIC_VERSION } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import type { AnalysisResult, Niche, VideoMeta } from "@/lib/agent/types";
import type { TranscriptResult } from "@/lib/agent/transcript";

function asVideo(row: {
  video_id: string;
  title: string;
  channel: string;
  duration_s: number;
  thumbnail_url: string;
  published_at: string | null;
  chapters: VideoMeta["chapters"] | null;
  captions_available: boolean | null;
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
  };
}

export async function readVideoCache(videoId: string): Promise<VideoMeta | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.from("video_cache").select("*").eq("video_id", videoId).maybeSingle();
  if (!data) return null;
  return asVideo(data);
}

export async function writeVideoCache(video: VideoMeta): Promise<void> {
  const supabase = await createClient();
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
  if (data.source === "none") {
    return { segments: [], words: [], language: data.language || "en", source: "none" };
  }
  const words = data.words ?? [];
  const segments = data.segments ?? [];
  if (!words.length) return null;
  return {
    segments,
    words,
    language: data.language || "en",
    source: "captions",
  };
}

export async function writeTranscriptCache(videoId: string, transcript: TranscriptResult): Promise<void> {
  const supabase = await createClient();
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
  const video = (data.video as VideoMeta | null) ?? (await readVideoCache(videoId));
  if (!video) return null;
  return {
    video,
    candidates: data.candidates,
    events: data.events ?? [],
  };
}

export async function writeAnalysisCache(
  videoId: string,
  result: AnalysisResult,
  extra?: { niche?: Niche; model?: string; source?: "llm" | "heuristic"; tokens?: number },
): Promise<void> {
  const supabase = await createClient();
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
