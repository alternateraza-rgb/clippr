import { mkdir, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAdminClient } from "../../lib/supabase/admin";
import { upsertTranscribeJob } from "../../lib/supabase/jobs";
import { downloadYoutubeViaApify } from "../../lib/ingest/apify";
import { fetchSupadataTranscript } from "../../lib/ingest/supadata";
import type { TranscriptResult } from "../../lib/agent/transcript";
import { run } from "./exec";
import { explodeWords, parseVtt, segmentsFromWords } from "./vtt";
import { transcribeFile } from "./whisper";

const AUDIO_CAP_S = 10 * 60;

function youtubeUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

async function writeCache(videoId: string, transcript: TranscriptResult) {
  const admin = createAdminClient();
  if (!admin) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  const { error } = await admin.from("transcript_cache").upsert({
    video_id: videoId,
    language: transcript.language,
    segments: transcript.segments,
    words: transcript.words,
    source: transcript.source,
    fetched_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

async function trySubs(dir: string, videoId: string): Promise<TranscriptResult | null> {
  try {
    await run("yt-dlp", [
      "--skip-download",
      "--no-warnings",
      "--write-auto-sub",
      "--write-sub",
      "--sub-langs",
      "en.*,en",
      "--convert-subs",
      "vtt",
      "--extractor-args",
      "youtube:player_client=android,web",
      "-o",
      join(dir, "subs"),
      youtubeUrl(videoId),
    ]);
  } catch {
    return null;
  }
  const files = await readdir(dir);
  const vtt = files.find((f) => f.endsWith(".vtt"));
  if (!vtt) return null;
  const raw = await readFile(join(dir, vtt), "utf8");
  const segments = parseVtt(raw);
  const words = explodeWords(segments);
  if (!words.length) return null;
  return { segments, words, language: "en", source: "captions" };
}

async function whisperFromFile(audio: string): Promise<TranscriptResult> {
  const result = await transcribeFile(audio);
  if (!result.words.length) throw new Error("Whisper returned no words");
  return {
    segments: segmentsFromWords(result.words),
    words: result.words,
    language: result.language || "en",
    source: "whisper",
  };
}

async function whisperWindow(dir: string, videoId: string): Promise<TranscriptResult> {
  const audio = join(dir, "audio.mp3");
  const apifyAudio = join(dir, "audio.m4a");
  try {
    if (await downloadYoutubeViaApify(videoId, apifyAudio, "audio")) {
      await run("ffmpeg", ["-y", "-i", apifyAudio, "-t", String(AUDIO_CAP_S), "-ac", "1", "-ar", "16000", "-b:a", "64k", audio]);
      return whisperFromFile(audio);
    }
  } catch (error) {
    console.error("[worker] apify audio failed, falling back to yt-dlp", error);
  }
  await run("yt-dlp", [
    "--no-playlist",
    "--no-warnings",
    "--force-overwrites",
    "-x",
    "--audio-format",
    "mp3",
    "--audio-quality",
    "7",
    "--download-sections",
    `*0-${AUDIO_CAP_S}`,
    "--force-keyframes-at-cuts",
    "--extractor-args",
    "youtube:player_client=android,web",
    "-o",
    audio,
    youtubeUrl(videoId),
  ]);
  return whisperFromFile(audio);
}

export async function processTranscribe(videoId: string) {
  if (!videoId) throw new Error("missing videoId");
  await upsertTranscribeJob({ videoId, status: "running" });
  const dir = join(tmpdir(), "clipmuse-transcribe", videoId);
  await mkdir(dir, { recursive: true });
  try {
    const cloud = await fetchSupadataTranscript(videoId);
    if (cloud?.words.length) {
      await writeCache(videoId, cloud);
      await upsertTranscribeJob({
        videoId,
        status: "ready",
        source: cloud.source === "whisper" ? "whisper" : "captions",
        wordCount: cloud.words.length,
      });
      return { ok: true, source: cloud.source, words: cloud.words.length };
    }
    const fromSubs = await trySubs(dir, videoId);
    const transcript = fromSubs ?? (await whisperWindow(dir, videoId));
    await writeCache(videoId, transcript);
    await upsertTranscribeJob({
      videoId,
      status: "ready",
      source: transcript.source === "whisper" ? "whisper" : "captions",
      wordCount: transcript.words.length,
    });
    return { ok: true, source: transcript.source, words: transcript.words.length };
  } catch (error) {
    await upsertTranscribeJob({
      videoId,
      status: "failed",
      error: error instanceof Error ? error.message.slice(0, 500) : "Transcribe failed",
    });
    throw error;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => null);
  }
}
