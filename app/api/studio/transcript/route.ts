import { readTranscriptCache } from "@/lib/supabase/cache";
import { readTranscribeJob, upsertTranscribeJob } from "@/lib/supabase/jobs";
import { parseYouTubeId } from "@/lib/youtube";
import { requestTranscribe, wakeWorker } from "@/lib/worker/client";
import { workerUrl } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(request: Request) {
  const videoId = parseYouTubeId(new URL(request.url).searchParams.get("videoId") || "");
  if (!videoId) {
    return Response.json({ message: "Missing videoId" }, { status: 400 });
  }
  const [transcript, job] = await Promise.all([readTranscriptCache(videoId), readTranscribeJob(videoId)]);
  const ready = Boolean(transcript?.words.length);
  return Response.json({
    ready,
    videoId,
    status: ready ? "ready" : (job?.status ?? "queued"),
    source: transcript?.source ?? job?.source ?? null,
    words: transcript?.words.length ?? job?.wordCount ?? 0,
    language: transcript?.language ?? null,
    error: job?.status === "failed" ? job.error : null,
    worker: Boolean(workerUrl()),
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { videoId?: string; url?: string };
  const videoId = parseYouTubeId(body.videoId || body.url || "");
  if (!videoId) {
    return Response.json({ message: "That doesn’t look like a YouTube link." }, { status: 400 });
  }
  const cached = await readTranscriptCache(videoId);
  if (cached?.words.length) {
    return Response.json({
      ok: true,
      ready: true,
      videoId,
      source: cached.source,
      words: cached.words.length,
    });
  }
  if (!workerUrl()) {
    return Response.json(
      { ok: false, reason: "not_configured", message: "Set CLIP_WORKER_URL and CLIP_WORKER_SECRET." },
      { status: 503 },
    );
  }
  await upsertTranscribeJob({ videoId, status: "queued" });
  await wakeWorker();
  const ping = await requestTranscribe(videoId, 90_000);
  return Response.json({
    ok: ping.ok,
    ready: false,
    videoId,
    reason: ping.ok ? undefined : ping.reason,
    message: ping.ok
      ? "Worker accepted transcribe."
      : `Worker did not accept transcribe (${ping.reason}).`,
  });
}
