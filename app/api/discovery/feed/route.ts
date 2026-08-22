import { readDiscovery } from "@/lib/discovery";
import { isDemoMode, hasYouTubeKey } from "@/lib/config";
import { getSessionUser } from "@/lib/auth/session";
import type { Niche } from "@/lib/agent/types";

export async function GET(request: Request) {
  const niche = new URL(request.url).searchParams.get("niche") as Niche | null;
  const user = await getSessionUser();
  const items = await readDiscovery({
    niche: niche || undefined,
    userId: user?.id,
  });
  return Response.json({
    items,
    live: !isDemoMode() && hasYouTubeKey(),
  });
}
