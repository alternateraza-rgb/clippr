import { getSessionUser } from "@/lib/auth/session";
import { loadReelStats } from "@/lib/stats/load";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ reels: [], videos: {}, posters: {}, unsorted: 0 });
  return Response.json(await loadReelStats(user.id));
}
