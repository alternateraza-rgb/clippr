import { hasSupabase, exportEnabled, isDemoMode, hasLlm, hasYouTubeKey } from "@/lib/config";

export async function GET() {
  return Response.json({
    authEnabled: hasSupabase(),
    exportEnabled: exportEnabled(),
    demo: isDemoMode(),
    liveAgent: !isDemoMode(),
    llm: hasLlm(),
    youtube: hasYouTubeKey(),
  });
}
