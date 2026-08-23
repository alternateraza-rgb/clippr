import {
  exportEnabled,
  hasLlm,
  hasServiceRole,
  hasSupabase,
  hasYouTubeKey,
  isDemoMode,
  workerUrl,
  hasSupadata,
  hasApify,
} from "@/lib/config";
import { workerHealth } from "@/lib/worker/client";

export async function GET() {
  const health = await workerHealth();
  return Response.json({
    authEnabled: hasSupabase(),
    exportEnabled: exportEnabled() || Boolean(workerUrl()),
    demo: isDemoMode(),
    liveAgent: !isDemoMode(),
    liveFeed: !isDemoMode() && hasYouTubeKey() && hasServiceRole(),
    llm: hasLlm(),
    youtube: hasYouTubeKey(),
    worker: Boolean(workerUrl()),
    ingest: hasSupadata(),
    download: hasApify(),
    workerReachable: Boolean(health?.ok),
    workerApify: health?.apify === true,
    workerApifyKnown: typeof health?.apify === "boolean",
    workerLlm: health?.llm === true,
    workerFfmpeg: health?.ffmpeg === true,
    workerProxy: health?.proxy === true,
    workerYtdlp: typeof health?.ytdlp === "string" ? health.ytdlp : "",
  });
}
