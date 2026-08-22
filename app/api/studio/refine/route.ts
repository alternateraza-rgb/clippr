import { requestRefine } from "@/lib/worker/client";
import { parseYouTubeId } from "@/lib/youtube";
import type { CaptionLine } from "@/lib/agent/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    videoId?: string;
    start?: number;
    end?: number;
  };
  const videoId = parseYouTubeId(body.videoId || "");
  const start = Number(body.start);
  const end = Number(body.end);
  if (!videoId || !Number.isFinite(start) || !Number.isFinite(end)) {
    return Response.json({ message: "Missing clip window." }, { status: 400 });
  }

  const result = await requestRefine({ videoId, start, end });
  if (!result.ok) {
    return Response.json(
      { message: result.reason === "not_configured" ? "Set CLIP_WORKER_URL and CLIP_WORKER_SECRET." : result.reason },
      { status: 502 },
    );
  }

  const captionLines = Array.isArray(result.captionLines)
    ? (result.captionLines as CaptionLine[])
    : [];
  if (!captionLines.length) {
    return Response.json({ message: "Worker returned no word timings." }, { status: 502 });
  }

  return Response.json({ ok: true, captionLines, words: result.words ?? 0 });
}
