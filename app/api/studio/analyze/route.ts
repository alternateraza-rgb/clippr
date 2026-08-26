import { runAnalysis, type StreamPacket } from "@/lib/agent/run";
import { clearCachedAnalysis, getCachedAnalysis, setCachedAnalysis } from "@/lib/agent/memory-cache";
import { parseYouTubeId } from "@/lib/youtube";
import type { AvoidedClip } from "@/lib/agent/score";
import type { Niche } from "@/lib/agent/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    url?: string;
    videoId?: string;
    niche?: Niche;
    refresh?: boolean;
    avoid?: AvoidedClip[];
  };
  const videoId = parseYouTubeId(body.videoId || body.url || "");
  if (!videoId) {
    return Response.json({ message: "That doesn’t look like a YouTube link." }, { status: 400 });
  }

  // Anything the user has already turned down. Capped and sanitised: this
  // goes into a model prompt, and an unbounded list from the browser would let
  // a caller push arbitrary text into it.
  const avoid: AvoidedClip[] = (Array.isArray(body.avoid) ? body.avoid : [])
    .slice(0, 6)
    .map((clip) => ({
      start: Math.max(0, Number(clip?.start) || 0),
      end: Math.max(0, Number(clip?.end) || 0),
      topic: clip?.topic ? String(clip.topic).slice(0, 200) : undefined,
      hook: clip?.hook ? String(clip.hook).slice(0, 200) : undefined,
    }))
    .filter((clip) => clip.end > clip.start);

  // Asking for a different idea has to skip both caches, or the rescan hands
  // back the very clip that was just rejected.
  const fresh = Boolean(body.refresh) || avoid.length > 0;
  if (fresh) clearCachedAnalysis(videoId);
  const cached = fresh ? undefined : getCachedAnalysis(videoId);
  const stream = new ReadableStream({
    async start(controller) {
      const send = (packet: StreamPacket) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(packet)}\n\n`));
        } catch {
          /* stream already closed */
        }
      };
      try {
        if (cached) {
          send({ type: "event", stage: "resolve", message: "Cache hit — skipping the model", at: 0 });
          send({ type: "event", stage: "done", message: "Ready.", at: 80 });
          send({ type: "result", analysis: cached });
          return;
        }
        for await (const packet of runAnalysis(videoId, body.niche ?? "finance", {
          bypassCache: fresh,
          avoid,
        })) {
          send(packet);
          // A rescan result belongs to this one request, not to the next
          // person who pastes the link.
          if (packet.type === "result" && !avoid.length) {
            setCachedAnalysis(videoId, packet.analysis);
          }
        }
      } catch (error) {
        send({
          type: "error",
          message: error instanceof Error ? error.message : "Analysis failed",
        });
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}

const encoder = new TextEncoder();
