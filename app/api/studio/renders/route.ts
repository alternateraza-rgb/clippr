import { getSessionUser } from "@/lib/auth/session";
import { getClipRenders, signedClipUrl } from "@/lib/supabase/cache";
import { pingWorker } from "@/lib/worker/client";

export const runtime = "nodejs";

async function withDownload(render: Awaited<ReturnType<typeof getClipRenders>>[number]) {
  if (render.status === "ready" && render.outputPath) {
    const downloadUrl = await signedClipUrl(render.outputPath);
    // Same key, .jpg — written by the worker after the upload. Older clips have
    // none, and a null poster is a supported state, not an error.
    const posterUrl = await signedClipUrl(render.outputPath.replace(/\.mp4$/, ".jpg")).catch(
      () => null,
    );
    return { ...render, downloadUrl, posterUrl };
  }
  return render;
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ renders: [] });

  const renders = await getClipRenders(user.id);

  // Settings wants counts and durations, not download links. Signing 40 URLs
  // to render three numbers is work nobody asked for.
  if (new URL(request.url).searchParams.get("meta") === "1") {
    return Response.json({ renders });
  }

  const queued = renders.filter((r) => r.status === "queued").slice(0, 3);
  await Promise.all(queued.map((r) => pingWorker(r.id).catch(() => null)));
  const hydrated = await Promise.all(renders.map(withDownload));
  return Response.json({ renders: hydrated });
}
