import { createAdminClient } from "./admin";

export type TranscribeJobStatus = "queued" | "running" | "ready" | "failed";

export type TranscribeJob = {
  videoId: string;
  status: TranscribeJobStatus;
  error?: string | null;
  source?: "captions" | "whisper" | null;
  wordCount?: number | null;
  updatedAt?: string;
};

export async function upsertTranscribeJob(input: {
  videoId: string;
  status: TranscribeJobStatus;
  error?: string | null;
  source?: "captions" | "whisper" | null;
  wordCount?: number | null;
}): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin || !input.videoId) return false;
  const { error } = await admin.from("transcribe_jobs").upsert({
    video_id: input.videoId,
    status: input.status,
    error: input.error ?? null,
    source: input.source ?? null,
    word_count: input.wordCount ?? null,
  });
  if (error) {
    console.error("[transcribe_jobs]", error.message);
    return false;
  }
  return true;
}

export async function readTranscribeJob(videoId: string): Promise<TranscribeJob | null> {
  const admin = createAdminClient();
  if (!admin || !videoId) return null;
  const { data } = await admin.from("transcribe_jobs").select("*").eq("video_id", videoId).maybeSingle();
  if (!data) return null;
  return {
    videoId: data.video_id,
    status: data.status,
    error: data.error,
    source: data.source,
    wordCount: data.word_count,
    updatedAt: data.updated_at,
  };
}
