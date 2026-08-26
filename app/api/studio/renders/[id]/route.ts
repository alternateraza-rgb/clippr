import { getSessionUser } from "@/lib/auth/session";
import { deleteClipRender, getClipRender, signedClipUrl } from "@/lib/supabase/cache";
import { pingWorker } from "@/lib/worker/client";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return Response.json({ message: "Sign in first." }, { status: 401 });
  const { id } = await context.params;
  let render = await getClipRender(user.id, id);
  if (!render) return Response.json({ message: "Not found" }, { status: 404 });
  if (render.status === "queued") {
    await pingWorker(render.id).catch(() => null);
    render = (await getClipRender(user.id, id)) ?? render;
  }
  let downloadUrl: string | null = null;
  if (render.status === "ready" && render.outputPath) {
    downloadUrl = await signedClipUrl(render.outputPath);
  }
  return Response.json({ render: { ...render, downloadUrl } });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return Response.json({ message: "Sign in first." }, { status: 401 });
  const { id } = await context.params;
  const ok = await deleteClipRender(user.id, id);
  if (!ok) return Response.json({ message: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
}
