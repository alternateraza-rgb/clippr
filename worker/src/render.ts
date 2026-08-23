import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAdminClient } from "../../lib/supabase/admin";
import { captionLinesForRange } from "../../lib/agent/compose";
import { jumpCutDuration, planJumpCuts, remapCaptionLines, type Interval } from "../../lib/agent/jumpcuts";
import type { CaptionLine, CaptionPreset, RenderStatus, WordTiming } from "../../lib/agent/types";
import { buildAss } from "./ass";
import { shotChain } from "./filters";
import { planShots, type Shot } from "../../lib/agent/shots";
import { trackSpeaker } from "./track";
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

type SourceInfo = { width: number; height: number };

/**
 * Frame size of the downloaded clip. The crop maths needs real dimensions —
 * assuming 1280x720 would frame a 4K source wrong. ffprobe is not installed
 * everywhere (a pip-installed ffmpeg ships the encoder alone), so fall back to
 * ffmpeg's own stream dump, which exits non-zero by design with no output file.
 */
async function probeSource(file: string): Promise<SourceInfo> {
  try {
    const { stdout } = await run("ffprobe", [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height",
      "-of",
      "csv=p=0",
      file,
    ]);
    const [w, h] = stdout.trim().split(",").map(Number);
    if (w > 0 && h > 0) return { width: w, height: h };
  } catch {
    // fall through to the ffmpeg dump
  }
  try {
    await run("ffmpeg", ["-hide_banner", "-i", file]);
  } catch (error) {
    const dump = error instanceof Error ? error.message : "";
    const match = /,\s(\d{2,5})x(\d{2,5})[\s,]/.exec(dump);
    if (match) return { width: Number(match[1]), height: Number(match[2]) };
  }
  return { width: 1280, height: 720 };
}

let videotoolbox: boolean | null = null;

/** Apple's hardware encoder where it exists — same job, a fraction of the CPU. */
async function encoderArgs(): Promise<string[]> {
  if (videotoolbox === null) {
    videotoolbox = await run("ffmpeg", ["-hide_banner", "-encoders"])
      .then(({ stdout }) => stdout.includes("h264_videotoolbox"))
      .catch(() => false);
  }
  return videotoolbox
    ? ["-c:v", "h264_videotoolbox", "-b:v", "6M", "-profile:v", "high"]
    : ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20"];
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
  if (end - start > 75) end = start + 75;

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

    await setStatus(renderId, { status: "downloading", progress: 25 });
    await setStatus(renderId, { status: "transcribing", progress: 38 });
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

    // Checkpoints exist so the wait screen can say something true. The gap
    // between "transcribed" and "finished" used to be one 62% update covering
    // tracking, encoding and upload — minutes of silence, which is what made
    // the UI look stuck.
    await setStatus(renderId, {
      status: "rendering",
      progress: 48,
      asr_source: asr,
      caption_lines: editedLines,
    });

    const frame = await probeSource(raw);
    // Framing follows the speaker where we can see them; where we cannot, the
    // shots still cut, just centred.
    const track = await trackSpeaker(raw);
    const shots = planShots(plan.keep, words, track.centerAt);
    await setStatus(renderId, { status: "rendering", progress: 58 });
    console.info(
      `[render] ${shots.length} shots · ${track.samples} face samples · ${outDuration.toFixed(1)}s`,
    );

    const assPath = join(dir, "captions.ass");
    await writeFile(assPath, buildAss(editedLines), "utf8");

    const out = join(dir, "out.mp4");
    // libass silently falls back to a default sans when the font is missing,
    // which is why captions render in the wrong typeface rather than failing.
    // The Docker image installs Anton system-wide; a laptop keeps it in the
    // repo or the user font directory.
    const fontDirs = [
      join(process.cwd(), "assets", "fonts"),
      `${process.env.HOME}/Library/Fonts`,
      "/usr/share/fonts/truetype/clipmuse",
      "/usr/share/fonts/truetype/liberation",
    ];
    const found = fontDirs.find((d) => existsSync(join(d, "Anton-Regular.ttf"))) ?? fontDirs.find(existsSync);
    const fontsDir = found ? `:fontsdir=${found}` : "";
    const gameplayFile = await fetchGameplayLoop(dir, row.gameplay, admin);
    const encoder = await encoderArgs();

    function buildArgs(opts: { shots: Shot[]; outDuration: number }) {
      const assFilter = `ass=${assPath.replace(/\\/g, "/").replace(/:/g, "\\:")}${fontsDir}`;
      const paneHeight = gameplayFile ? 692 : 1280;
      const parts: string[] = [
        shotChain(
          opts.shots,
          frame,
          { width: 720, height: paneHeight },
          { v: "0:v", a: "0:a" },
          { v: "vcat", a: "acat" },
        ),
      ];

      if (gameplayFile) {
        parts.push("[1:v]scale=720:588:force_original_aspect_ratio=increase,crop=720:588[bot]");
        parts.push("[vcat][bot]vstack=inputs=2[stack]");
        parts.push(`[stack]${assFilter}[vout]`);
      } else {
        parts.push(`[vcat]${assFilter}[vout]`);
      }

      return [
        "-y",
        "-i",
        raw,
        ...(gameplayFile ? ["-stream_loop", "-1", "-i", gameplayFile] : []),
        "-t",
        opts.outDuration.toFixed(2),
        "-filter_complex",
        parts.filter(Boolean).join(";"),
        "-map",
        "[vout]",
        "-map",
        "[acat]",
        ...encoder,
        "-c:a",
        "aac",
        "-b:a",
        "160k",
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
      await setStatus(renderId, { status: "rendering", progress: 70 });
      await run("ffmpeg", buildArgs({ shots, outDuration }), { timeoutMs: 600_000 });
    } catch (renderErr) {
      // One static shot over the whole clip: no cuts, no reframing, but a file
      // the user can post beats a failed render.
      console.error("[render] edited pass failed, falling back to a single shot", renderErr);
      finalDuration = duration;
      await writeFile(assPath, buildAss(lines), "utf8");
      await run(
        "ffmpeg",
        buildArgs({
          shots: [{ start: 0, end: duration, zoom: 1, center: null }],
          outDuration: duration,
        }),
        { timeoutMs: 600_000 },
      );
    }

    await setStatus(renderId, { status: "rendering", progress: 90 });

    const bytes = await readFile(out);
    const info = await stat(out);
    const outputPath = `${row.user_id}/${renderId}.mp4`;
    const upload = await admin.storage.from("clips").upload(outputPath, bytes, {
      contentType: "video/mp4",
      upsert: true,
    });
    if (upload.error) throw new Error(upload.error.message);

    // A poster beside the video, keyed off the same name so the API can sign it
    // without a schema change. A grid of <video> elements with no poster has to
    // fetch each file just to paint a first frame.
    try {
      const poster = join(dir, "poster.jpg");
      await run("ffmpeg", ["-y", "-ss", "1", "-i", out, "-frames:v", "1", "-q:v", "4", poster], {
        timeoutMs: 60_000,
      });
      await admin.storage.from("clips").upload(`${row.user_id}/${renderId}.jpg`, await readFile(poster), {
        contentType: "image/jpeg",
        upsert: true,
      });
    } catch (posterErr) {
      // Cosmetic. The card falls back to a video frame.
      console.warn("[render] no poster frame", posterErr instanceof Error ? posterErr.message : posterErr);
    }

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

/** Nothing legitimately sits in one in-flight status this long. */
const STALE_MS = 20 * 60 * 1000;

const IN_FLIGHT = ["downloading", "transcribing", "scoring", "rendering"];

export async function drainQueued(limit = 5) {
  const admin = createAdminClient();
  if (!admin) return [];
  // A worker killed mid-render — deploy, spin-down, or a wedged subprocess —
  // leaves the row in an in-flight status that nothing ever looks at again, so
  // the clip is stuck at "downloading 8%" forever. Put those back in the queue.
  const { data: stale } = await admin
    .from("clip_renders")
    .update({ status: "queued", progress: 0 })
    .in("status", IN_FLIGHT)
    .lt("updated_at", new Date(Date.now() - STALE_MS).toISOString())
    .select("id");
  if (stale?.length) console.warn(`[render] requeued ${stale.length} stalled render(s)`);
  const { data } = await admin
    .from("clip_renders")
    .select("id")
    .in("status", ["queued"])
    .order("created_at", { ascending: true })
    .limit(limit);
  return (data ?? []).map((row) => row.id as string);
}
