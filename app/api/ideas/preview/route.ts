import { hasLlm } from "@/lib/config";
import { completeJson } from "@/lib/llm/complete";
import {
  PREVIEW_SYSTEM,
  buildPreviewPrompt,
  coercePreview,
  heuristicPreview,
  type PreviewInput,
} from "@/lib/agent/idea-preview";

/** Metadata only — this never touches the transcript, so it stays sub-second. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Partial<PreviewInput>;

  const videoId = String(body.videoId ?? "").slice(0, 32);
  if (!videoId) {
    return Response.json({ message: "videoId is required" }, { status: 400 });
  }

  const input: PreviewInput = {
    videoId,
    title: String(body.title ?? "Untitled").slice(0, 300),
    channel: String(body.channel ?? "Unknown channel").slice(0, 120),
    durationS: Math.max(0, Math.min(60 * 60 * 12, Number(body.durationS) || 0)),
    description: body.description ? String(body.description).slice(0, 1200) : undefined,
    niche: String(body.niche ?? "general").slice(0, 40),
    hook: body.hook ? String(body.hook).slice(0, 200) : undefined,
    whyItClips: body.whyItClips ? String(body.whyItClips).slice(0, 400) : undefined,
    score: Math.max(0, Math.min(100, Number(body.score) || 50)),
  };

  if (!hasLlm()) {
    return Response.json({ preview: heuristicPreview(input) });
  }

  try {
    const { text } = await completeJson({
      system: PREVIEW_SYSTEM,
      user: buildPreviewPrompt(input),
      maxTokens: 900,
    });
    return Response.json({ preview: coercePreview(JSON.parse(text), input) });
  } catch {
    // A model outage should downgrade the sheet, not empty it.
    return Response.json({ preview: heuristicPreview(input) });
  }
}
