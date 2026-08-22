import { getSessionUser } from "@/lib/auth/session";
import { getClipRenders, signedClipUrl } from "@/lib/supabase/cache";
import { pingWorker } from "@/lib/worker/client";

export const runtime = "nodejs";

async function withDownload(render: Awaited<ReturnType<typeof getClipRenders>>[number]) {
  if (render.status === "ready" && render.outputPath) {
    const downloadUrl = await signedClipUrl(render.outputPath);
    return { ...render, downloadUrl };
  }
  return render;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ renders: [] });
  const renders = await getClipRenders(user.id);
  const queued = renders.filter((r) => r.status === "queued").slice(0, 3);
  await Promise.all(queued.map((r) => pingWorker(r.id).catch(() => null)));
  const hydrated = await Promise.all(renders.map(withDownload));
  return Response.json({ renders: hydrated });
}
