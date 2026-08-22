import { mkdir, readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { exportEnabled } from "@/lib/config";
import type { CaptionLine, CaptionPreset, GameplayTrack } from "@/lib/agent/types";

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

export async function POST(request: Request) {
  const body = (await request.json()) as {
    videoId?: string;
    start?: number;
    end?: number;
    captionLines?: CaptionLine[];
    gameplay?: GameplayTrack;
    captionPreset?: CaptionPreset;
  };

  if (!exportEnabled()) {
    return Response.json({
      status: "preview",
      message: "Export is off. Set ENABLE_LOCAL_EXPORT=true to render an mp4 locally.",
    });
  }

  if (!body.videoId || body.start == null || body.end == null) {
    return Response.json({ message: "Missing composition" }, { status: 400 });
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
  const start = Math.max(0, body.start);
  const end = Math.max(start + 1, body.end);

  try {
    await run("yt-dlp", [
      "-f",
      "bv*[height<=1080]+ba/b",
      "--download-sections",
      `*${start.toFixed(2)}-${end.toFixed(2)}`,
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
      "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
      "-c:v",
      "libx264",
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
