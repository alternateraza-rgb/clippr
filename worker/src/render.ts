import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAdminClient } from "../../lib/supabase/admin";
import { hasR2 } from "../../lib/config";
import { putR2Object } from "../../lib/storage/r2";
import { captionLinesForRange } from "../../lib/agent/compose";
import { jumpCutDuration, planJumpCuts, remapCaptionLines, type Interval } from "../../lib/agent/jumpcuts";
import { snapToSentences } from "../../lib/agent/boundaries";
import type {
  CaptionLine,
  CaptionPreset,
  ClipCandidate,
  RenderStatus,
  StorySegment,
  WordTiming,
} from "../../lib/agent/types";
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
  moment: ClipCandidate | null;
};

async function setStatus(
  id: string,
  patch: {
    status?: RenderStatus;
    progress?: number;
    error?: string | null;
    asr_source?: string;
    storage?: "supabase" | "r2";
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

/** Downloaded either side of a chosen span, purely so the cut can be moved onto
 *  a real sentence boundary. None of it necessarily reaches the output. */
const HEAD_PAD_S = 2;
const TAIL_PAD_S = 12;

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
  // A 60s clip used to land near 30MB because the bitrate was fixed: 3.5M was
  // spent whether the frame was a still talking head or a fast cut. Quality is
  // targeted instead of bitrate, so easy footage — which almost all of this is
  // — costs a fraction of that, and hard footage still gets what it needs.
  //
  // The ceiling stays well under the bucket's object limit; overshooting it
  // once failed a render at the very last step, after all the work was done.
  //
  // Every platform re-encodes on upload anyway, so bytes past the point of
  // visible difference are spent twice and seen by nobody.
  return videotoolbox
    ? ["-c:v", "h264_videotoolbox", "-b:v", "2M", "-maxrate", "3M", "-profile:v", "high"]
    : ["-c:v", "libx264", "-preset", "fast", "-crf", "25", "-maxrate", "3M", "-bufsize", "6M"];
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

  // Per attempt, not per render. The render ceiling in the worker abandons a
  // slow job without stopping it, so a retry of the same id can be running
  // while the first attempt is still alive — and a shared directory means one
  // run's cleanup deletes the other's half-downloaded files.
  const dir = join(tmpdir(), "clipmuse-worker", `${renderId}-${Date.now().toString(36)}`);
  await mkdir(dir, { recursive: true });

  try {
    await setStatus(renderId, { status: "downloading", progress: 8, error: null });

    // The clip is a story assembled from spans across the tape. A render with
    // no segments is the single-window case, which is just a story of one.
    const segments: StorySegment[] =
      row.moment?.segments?.length
        ? row.moment.segments
        : [{ start, end, quote: "", role: "setup" }];

    const raw = join(dir, "raw.mp4");
    const pieces: string[] = [];
    let assembled = 0;

    for (const [index, segment] of segments.entries()) {
      // Padding either side is downloaded so the cut can be moved onto a real
      // sentence boundary. Most of it is thrown away again.
      const from = Math.max(0, segment.start - HEAD_PAD_S);
      const to = segment.end + TAIL_PAD_S;
      const sourceFile = join(dir, `src-${index}.mp4`);
      const piece = join(dir, `piece-${index}.mp4`);
      // Ask for just this window. A provider that can only return the whole
      // video reports offset 0, and the cut below stays correct either way.
      const source = await downloadSource(row.video_id, sourceFile, "video", {
        start: from,
        end: to,
      });

      // Where the chosen span sits inside the downloaded file.
      let cutFrom = segment.start - source.offset;
      let cutTo = segment.end - source.offset;

      // Decide the boundary here, on this piece alone, while the audio is still
      // continuous. Doing it after assembly does not work: Whisper is then
      // listening across hard joins, and it segments the seam itself rather
      // than the sentences either side of it.
      try {
        const probeAudio = join(dir, `probe-${index}.mp3`);
        await run(
          "ffmpeg",
          ["-y", "-i", sourceFile, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", probeAudio],
          { timeoutMs: 120_000 },
        );
        const probe = await transcribeFile(probeAudio);
        const [snappedFrom, snappedTo] = snapToSentences(
          probe.sentences,
          [cutFrom, cutTo],
          probe.words,
        );
        const moved =
          Math.abs(snappedTo - cutTo) > 0.2 || Math.abs(snappedFrom - cutFrom) > 0.2;
        if (snappedTo - snappedFrom > 3) {
          if (moved) {
            console.info(
              `[render] segment ${index + 1} snapped to sentence bounds: ` +
                `${cutFrom.toFixed(1)}-${cutTo.toFixed(1)} → ${snappedFrom.toFixed(1)}-${snappedTo.toFixed(1)}`,
            );
          }
          console.info(
            `[diag] render=${renderId} seg=${index + 1}/${segments.length} ` +
              `snap=${moved ? "applied" : "already-on-bounds"} ` +
              `startDelta=${(snappedFrom - cutFrom).toFixed(2)}s endDelta=${(snappedTo - cutTo).toFixed(2)}s`,
          );
          cutFrom = snappedFrom;
          cutTo = snappedTo;
        } else {
          // Distinct from "already perfect", and the distinction is the point:
          // no sentence boundary inside the window means the caption timeline is
          // further out than the snap can reach, not that the cut was good.
          console.info(
            `[diag] render=${renderId} seg=${index + 1}/${segments.length} snap=no-candidate-in-window`,
          );
        }
        await rm(probeAudio, { force: true }).catch(() => null);
      } catch (probeErr) {
        // A failed probe means the model's own boundary stands. Worse cut,
        // still a clip.
        console.info(
          `[diag] render=${renderId} seg=${index + 1}/${segments.length} snap=probe-failed`,
        );
        console.warn(
          `[render] boundary probe failed on segment ${index + 1}`,
          probeErr instanceof Error ? probeErr.message.slice(0, 120) : probeErr,
        );
      }

      const span = Math.max(1, cutTo - cutFrom);
      await cutReencode(sourceFile, piece, cutFrom, span, "video");
      await rm(sourceFile, { force: true }).catch(() => null);
      pieces.push(piece);
      assembled += span;
      // Downloads dominate the early wait, so spread the checkpoints over them.
      await setStatus(renderId, {
        status: "downloading",
        progress: 8 + Math.round(((index + 1) / segments.length) * 17),
      });
    }

    if (pieces.length === 1) {
      await rename(pieces[0], raw);
    } else {
      // Concat demuxer is safe here because cutReencode already normalised
      // every piece to the same codec, resolution and rate.
      const list = join(dir, "pieces.txt");
      await writeFile(list, pieces.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n"), "utf8");
      await run("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", raw], {
        timeoutMs: 300_000,
      });
      console.info(`[render] assembled ${pieces.length} segments (${assembled.toFixed(1)}s)`);
    }
    const duration = assembled;

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

    // Boundaries were already decided per segment, before assembly. All that is
    // left here is dead air, and only when the word timing can be trusted.
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
    const posterPath = `${row.user_id}/${renderId}.jpg`;

    // R2 when it is configured, Supabase otherwise. The choice is recorded on
    // the row so reads never have to probe both, and clips written before the
    // move keep resolving against the store that actually holds them.
    const storage = hasR2() ? "r2" : "supabase";

    const putClip = async (key: string, body: Buffer, contentType: string) => {
      if (storage === "r2") {
        await putR2Object(key, body, contentType);
        return;
      }
      const upload = await admin.storage.from("clips").upload(key, body, {
        contentType,
        upsert: true,
      });
      if (upload.error) throw new Error(upload.error.message);
    };

    await putClip(outputPath, bytes, "video/mp4");

    // A poster beside the video, keyed off the same name so the API can sign it
    // without a schema change. A grid of <video> elements with no poster has to
    // fetch each file just to paint a first frame.
    try {
      const poster = join(dir, "poster.jpg");
      await run("ffmpeg", ["-y", "-ss", "1", "-i", out, "-frames:v", "1", "-q:v", "4", poster], {
        timeoutMs: 60_000,
      });
      await putClip(posterPath, await readFile(poster), "image/jpeg");
    } catch (posterErr) {
      // Cosmetic. The card falls back to a video frame.
      console.warn("[render] no poster frame", posterErr instanceof Error ? posterErr.message : posterErr);
    }

    await setStatus(renderId, {
      status: "ready",
      progress: 100,
      output_path: outputPath,
      storage,
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
