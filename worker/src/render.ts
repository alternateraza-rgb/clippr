import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAdminClient } from "../../lib/supabase/admin";
import { captionLinesForRange } from "../../lib/agent/compose";
import type { CaptionLine, CaptionPreset, RenderStatus } from "../../lib/agent/types";
import { buildAss } from "./ass";
import { run } from "./exec";
import { transcribeFile } from "./whisper";
import { cutReencode, downloadSource } from "./media";

type RenderRow = {
  id: string;
  user_id: string;
  video_id: string;
  start_s: number | null;
  end_s: number | null;
  caption_preset: CaptionPreset | null;
  caption_lines: CaptionLine[] | null;
  gameplay: string | null;
};

async function setStatus(
  id: string,
  patch: {
    status?: RenderStatus;
    progress?: number;
    error?: string | null;
    asr_source?: string;
    output_path?: string;
    output_bytes?: number;
    duration_s?: number;
    finished_at?: string;
    caption_lines?: CaptionLine[];
  },
) {
  const admin = createAdminClient();
  if (!admin) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  const { error } = await admin.from("clip_renders").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

async function fetchGameplayLoop(
  dir: string,
  track: string | null,
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
) {
  if (!track || track === "none") return null;
  const { data, error } = await admin.storage.from("gameplay").download(`${track}.mp4`);
  if (error || !data) return null;
  const dest = join(dir, "gameplay.mp4");
  await writeFile(dest, Buffer.from(await data.arrayBuffer()));
  return dest;
}

export async function processRender(renderId: string) {
  const admin = createAdminClient();
  if (!admin) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  const { data, error } = await admin.from("clip_renders").select("*").eq("id", renderId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Render not found");
  const row = data as RenderRow;

  let start = Math.max(0, Number(row.start_s) || 0);
  let end = Math.max(start + 8, Number(row.end_s) || start + 20);
  if (end - start > 45) end = start + 45;

  const dir = join(tmpdir(), "clipmuse-worker", renderId);
  await mkdir(dir, { recursive: true });

  try {
    await setStatus(renderId, { status: "downloading", progress: 8, error: null });
    const duration = Math.max(1, end - start);
    const apifyFile = join(dir, "full.mp4");
    const raw = join(dir, "raw.mp4");
    await downloadSource(row.video_id, apifyFile, "video");
    await cutReencode(apifyFile, raw, start, duration, "video");

    await setStatus(renderId, { status: "transcribing", progress: 35 });
    const audio = join(dir, "audio.mp3");
    await run("ffmpeg", ["-y", "-i", raw, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", audio]);

    let lines = Array.isArray(row.caption_lines) ? row.caption_lines : [];
    let asr: "captions" | "whisper" = lines.length ? "captions" : "whisper";
    try {
      const transcript = await transcribeFile(audio);
      if (transcript.words.length) {
        const last = transcript.words[transcript.words.length - 1]?.end ?? end - start;
        lines = captionLinesForRange(transcript.words, 0, last + 0.05);
        asr = "whisper";
      }
    } catch (err) {
      if (!lines.length) throw err;
    }

    await setStatus(renderId, {
      status: "rendering",
      progress: 62,
      asr_source: asr,
      caption_lines: lines,
    });

    const assPath = join(dir, "captions.ass");
    await writeFile(assPath, buildAss(lines, row.caption_preset ?? "hormozi"), "utf8");
    const out = join(dir, "out.mp4");
    const fontsDir = existsSync("/usr/share/fonts/truetype/clipmuse")
      ? ":fontsdir=/usr/share/fonts/truetype/clipmuse"
      : existsSync("/usr/share/fonts/truetype/liberation")
        ? ":fontsdir=/usr/share/fonts/truetype/liberation"
        : "";
    const assFilter = `ass=${assPath.replace(/\\/g, "/").replace(/:/g, "\\:")}${fontsDir}`;
    const gameplayFile = await fetchGameplayLoop(dir, row.gameplay, admin);

    const vf = gameplayFile
      ? [
          "[0:v]scale=720:692:force_original_aspect_ratio=increase,crop=720:692[top]",
          "[1:v]scale=720:588:force_original_aspect_ratio=increase,crop=720:588[bot]",
          "[top][bot]vstack=inputs=2[stack]",
          `[stack]${assFilter}[v]`,
        ].join(";")
      : [
          "scale=720:1280:force_original_aspect_ratio=increase",
          "crop=720:1280",
          assFilter,
        ].join(",");
    const ffArgs = gameplayFile
      ? [
          "-y",
          "-i",
          raw,
          "-stream_loop",
          "-1",
          "-i",
          gameplayFile,
          "-t",
          duration.toFixed(2),
          "-filter_complex",
          vf,
          "-map",
          "[v]",
          "-map",
          "0:a?",
          "-c:v",
          "libx264",
          "-preset",
          "ultrafast",
          "-crf",
          "23",
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          "-shortest",
          "-movflags",
          "+faststart",
          "-pix_fmt",
          "yuv420p",
          out,
        ]
      : [
          "-y",
          "-i",
          raw,
          "-vf",
          vf,
          "-c:v",
          "libx264",
          "-preset",
          "ultrafast",
          "-crf",
          "23",
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          "-movflags",
          "+faststart",
          "-pix_fmt",
          "yuv420p",
          out,
        ];
    await run("ffmpeg", ffArgs);

    const bytes = await readFile(out);
    const info = await stat(out);
    const outputPath = `${row.user_id}/${renderId}.mp4`;
    const upload = await admin.storage.from("clips").upload(outputPath, bytes, {
      contentType: "video/mp4",
      upsert: true,
    });
    if (upload.error) throw new Error(upload.error.message);

    await setStatus(renderId, {
      status: "ready",
      progress: 100,
      output_path: outputPath,
      output_bytes: info.size,
      duration_s: end - start,
      finished_at: new Date().toISOString(),
      error: null,
    });
  } catch (error) {
    await setStatus(renderId, {
      status: "failed",
      progress: 100,
      error: error instanceof Error ? error.message.slice(0, 500) : "Render failed",
      finished_at: new Date().toISOString(),
    });
    throw error;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => null);
  }
}

export async function drainQueued(limit = 5) {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("clip_renders")
    .select("id")
    .in("status", ["queued"])
    .order("created_at", { ascending: true })
    .limit(limit);
  return (data ?? []).map((row) => row.id as string);
}
