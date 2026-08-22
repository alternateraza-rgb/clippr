import {
  exportEnabled,
  hasLlm,
  hasServiceRole,
  hasSupabase,
  hasYouTubeKey,
  isDemoMode,
  workerUrl,
} from "@/lib/config";

export async function GET() {
  return Response.json({
    authEnabled: hasSupabase(),
    exportEnabled: exportEnabled() || Boolean(workerUrl()),
    demo: isDemoMode(),
    liveAgent: !isDemoMode(),
    liveFeed: !isDemoMode() && hasYouTubeKey() && hasServiceRole(),
    llm: hasLlm(),
    youtube: hasYouTubeKey(),
    worker: Boolean(workerUrl()),
  });
}
