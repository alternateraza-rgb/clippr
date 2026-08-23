import { mkdir, readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { exportEnabled } from "@/lib/config";
import { cookieArgs, ytdlpBaseArgs } from "@/lib/ingest/ytdlp";
import type { CaptionLine, CaptionPreset, ClipCandidate, GameplayTrack } from "@/lib/agent/types";
import { getSessionUser } from "@/lib/auth/session";
import { insertClipRender } from "@/lib/supabase/cache";
import { pingWorker, wakeWorker } from "@/lib/worker/client";
import { workerUrl } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 120;

function run(cmd: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    child.stderr.on("data", (d) => {
      err += d.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(err || `${cmd} exited ${code}`));
    });
  });
}

async function which(bin: string) {
  try {
    await run("which", [bin]);
    return true;
  } catch {
    return false;
  }
}

function clampRange(start: number, end: number) {
  const s = Math.max(0, start);
  let e = Math.max(s + 8, end);
  if (e - s > 45) e = s + 45;
  return { start: s, end: e };
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    videoId?: string;
    start?: number;
    end?: number;
    captionLines?: CaptionLine[];
    gameplay?: GameplayTrack;
    captionPreset?: CaptionPreset;
    candidate?: ClipCandidate;
    jobId?: string;
  };

  if (!body.videoId || body.start == null || body.end == null) {
    return Response.json({ message: "Missing composition" }, { status: 400 });
  }

  const range = clampRange(body.start, body.end);
  const user = await getSessionUser();

  if (user) {
    const renderId = await insertClipRender({
      userId: user.id,
      videoId: body.videoId,
      jobId: body.jobId,
      start: range.start,
      end: range.end,
      gameplay: body.gameplay ?? "none",
      captionPreset: body.captionPreset ?? "hormozi",
      captionLines: body.captionLines ?? [],
      moment: body.candidate,
    });
    if (renderId) {
      await wakeWorker();
      const ping = await pingWorker(renderId, 90_000);
      return Response.json({
        status: "queued",
        renderId,
        worker: ping.ok,
        message: ping.ok
          ? "Rendering in the background. Open Library when it is ready."
          : workerUrl()
            ? "Queued. The worker is waking up — check Library in a minute."
            : "Queued. Deploy the Render worker and it will pick this up.",
      });
    }
  }

  if (!exportEnabled()) {
    return Response.json({
      status: "preview",
      message: user
        ? "Could not queue a render. Check SUPABASE_SERVICE_ROLE_KEY."
        : "Sign in to export, or set ENABLE_LOCAL_EXPORT=true for a local mp4.",
    });
  }

  const hasYtdlp = await which("yt-dlp");
  const hasFf = await which("ffmpeg");
  if (!hasYtdlp || !hasFf) {
    return Response.json({
      status: "preview",
      message: "yt-dlp and ffmpeg are required on this machine for local export.",
    });
  }

  const dir = join(tmpdir(), "clipmuse");
  await mkdir(dir, { recursive: true });
  const raw = join(dir, `${body.videoId}-raw.mp4`);
  const out = join(dir, `${body.videoId}-out.mp4`);

  try {
    await run("yt-dlp", [
      ...ytdlpBaseArgs(),
      ...(await cookieArgs(dir)),
      "-f",
      "bv*[height<=720]+ba/b",
      "--download-sections",
      `*${range.start.toFixed(2)}-${range.end.toFixed(2)}`,
      "--force-keyframes-at-cuts",
      "-o",
      raw,
      "--force-overwrites",
      `https://www.youtube.com/watch?v=${body.videoId}`,
    ]);
    await run("ffmpeg", [
      "-y",
      "-i",
      raw,
      "-vf",
      "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280:(iw-720)/2:(ih-1280)*0.32",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-c:a",
      "aac",
      "-movflags",
      "+faststart",
      out,
    ]);
    const file = await readFile(out);
    await unlink(raw).catch(() => null);
    await unlink(out).catch(() => null);
    return new Response(file, {
      headers: {
        "content-type": "video/mp4",
        "content-disposition": `attachment; filename="clipmuse-${body.videoId}.mp4"`,
      },
    });
  } catch (error) {
    return Response.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Export failed",
      },
      { status: 500 },
    );
  }
}
