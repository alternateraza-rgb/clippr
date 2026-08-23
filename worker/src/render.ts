import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAdminClient } from "../../lib/supabase/admin";
import { captionLinesForRange } from "../../lib/agent/compose";
import { jumpCutDuration, planJumpCuts, remapCaptionLines, type Interval } from "../../lib/agent/jumpcuts";
import type { CaptionLine, CaptionPreset, RenderStatus, WordTiming } from "../../lib/agent/types";
import { buildAss } from "./ass";
import { biasedCrop, jumpCutChain, kenBurnsZoom } from "./filters";
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

async function probeFps(file: string): Promise<number> {
  try {
    const { stdout } = await run("ffprobe", [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=r_frame_rate",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      file,
    ]);
    const raw = stdout.trim();
    const [num, den] = raw.split("/").map(Number);
    if (den) return num / den;
    if (Number(raw)) return Number(raw);
  } catch {
    // ffprobe is not always installed next to ffmpeg — pip-installed builds
    // ship the encoder alone — so read the rate off ffmpeg's own stream dump.
    // `ffmpeg -i` with no output exits non-zero, hence the parse in catch.
  }
  try {
    await run("ffmpeg", ["-hide_banner", "-i", file]);
  } catch (error) {
    const dump = error instanceof Error ? error.message : "";
    const fps = Number(/([\d.]+) fps/.exec(dump)?.[1]);
    if (fps) return fps;
  }
  return 30;
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
    const sourceFile = join(dir, "full.mp4");
    const raw = join(dir, "raw.mp4");
    // Ask for just the clip window. A provider that can only return the whole
    // video reports offset 0, and the cut below stays correct either way.
    const source = await downloadSource(row.video_id, sourceFile, "video", { start, end });
    await cutReencode(sourceFile, raw, start - source.offset, duration, "video");

    await setStatus(renderId, { status: "transcribing", progress: 35 });
    const audio = join(dir, "audio.mp3");
    await run("ffmpeg", ["-y", "-i", raw, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", audio]);

    let lines = Array.isArray(row.caption_lines) ? row.caption_lines : [];
    let asr = lines.length ? "captions" : "whisper";
    let words: WordTiming[] = [];
    let whisperOk = false;
    for (let attempt = 0; attempt < 2 && !whisperOk; attempt++) {
      try {
        const transcript = await transcribeFile(audio);
        if (transcript.words.length) {
          words = transcript.words;
          const last = words[words.length - 1]?.end ?? duration;
          lines = captionLinesForRange(words, 0, last + 0.05);
          asr = "whisper";
          whisperOk = true;
        }
      } catch (err) {
        if (attempt === 1) {
          if (!lines.length) throw err;
          asr = "captions-approx";
          console.error("[render] whisper failed twice, falling back to approximate captions", err);
        }
      }
    }

    // Only jump-cut dead air when we trust the word timing it's based on —
    // cutting video on fabricated/approximate timestamps would slice into
    // real speech.
    const plan = whisperOk
      ? planJumpCuts(words, duration)
      : ({ keep: [[0, duration] as Interval], removed: [] } as { keep: Interval[]; removed: Interval[] });
    const editedLines = plan.removed.length ? remapCaptionLines(lines, plan.removed) : lines;
    const outDuration = plan.removed.length ? jumpCutDuration(duration, plan.removed) : duration;

    await setStatus(renderId, {
      status: "rendering",
      progress: 62,
      asr_source: asr,
      caption_lines: editedLines,
    });

    const preset = row.caption_preset ?? "hormozi";
    const assEditedPath = join(dir, "captions.ass");
    await writeFile(assEditedPath, buildAss(editedLines, preset), "utf8");
    const assPlainPath = plan.removed.length ? join(dir, "captions-plain.ass") : assEditedPath;
    if (plan.removed.length) {
      await writeFile(assPlainPath, buildAss(lines, preset), "utf8");
    }

    const out = join(dir, "out.mp4");
    const fontsDir = existsSync("/usr/share/fonts/truetype/clipmuse")
      ? ":fontsdir=/usr/share/fonts/truetype/clipmuse"
      : existsSync("/usr/share/fonts/truetype/liberation")
        ? ":fontsdir=/usr/share/fonts/truetype/liberation"
        : "";
    const gameplayFile = await fetchGameplayLoop(dir, row.gameplay, admin);
    const fps = await probeFps(raw);

    function buildArgs(opts: { withEdits: boolean; keep: Interval[]; assPath: string; outDuration: number }) {
      const assFilter = `ass=${opts.assPath.replace(/\\/g, "/").replace(/:/g, "\\:")}${fontsDir}`;
      const zoom = opts.withEdits;
      const parts: string[] = [];
      let videoLabel: string;
      let audioMap: string;

      if (opts.withEdits && opts.keep.length > 1) {
        parts.push(jumpCutChain(opts.keep, { v: "0:v", a: "0:a" }, { v: "vcat", a: "acat" }));
        videoLabel = "[vcat]";
        audioMap = "[acat]";
      } else {
        videoLabel = "[0:v]";
        audioMap = "0:a?";
      }

      if (gameplayFile) {
        let top = `${videoLabel}scale=720:692:force_original_aspect_ratio=increase,${biasedCrop(720, 692)}`;
        if (zoom) top += `,${kenBurnsZoom(720, 692, fps)}`;
        parts.push(`${top}[top]`);
        parts.push("[1:v]scale=720:588:force_original_aspect_ratio=increase,crop=720:588[bot]");
        parts.push("[top][bot]vstack=inputs=2[stack]");
        parts.push(`[stack]${assFilter}[vout]`);
      } else {
        let main = `${videoLabel}scale=720:1280:force_original_aspect_ratio=increase,${biasedCrop(720, 1280)}`;
        if (zoom) main += `,${kenBurnsZoom(720, 1280, fps)}`;
        parts.push(`${main}[vpre]`);
        parts.push(`[vpre]${assFilter}[vout]`);
      }

      const filterComplex = parts.filter(Boolean).join(";");
      return [
        "-y",
        "-i",
        raw,
        ...(gameplayFile ? ["-stream_loop", "-1", "-i", gameplayFile] : []),
        "-t",
        opts.outDuration.toFixed(2),
        "-filter_complex",
        filterComplex,
        "-map",
        "[vout]",
        "-map",
        audioMap,
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
        ...(gameplayFile ? ["-shortest"] : []),
        "-movflags",
        "+faststart",
        "-pix_fmt",
        "yuv420p",
        out,
      ];
    }

    let finalDuration = outDuration;
    try {
      await run("ffmpeg", buildArgs({ withEdits: true, keep: plan.keep, assPath: assEditedPath, outDuration }));
    } catch (renderErr) {
      console.error("[render] edited pass failed, falling back to plain crop", renderErr);
      finalDuration = duration;
      await run(
        "ffmpeg",
        buildArgs({ withEdits: false, keep: [[0, duration]], assPath: assPlainPath, outDuration: duration }),
      );
    }

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
      duration_s: finalDuration,
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
