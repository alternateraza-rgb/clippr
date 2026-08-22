import { runAnalysis, type StreamPacket } from "@/lib/agent/run";
import { getCachedAnalysis, setCachedAnalysis } from "@/lib/agent/memory-cache";
import { parseYouTubeId } from "@/lib/youtube";
import type { Niche } from "@/lib/agent/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    url?: string;
    videoId?: string;
    niche?: Niche;
  };
  const videoId = parseYouTubeId(body.videoId || body.url || "");
  if (!videoId) {
    return Response.json({ message: "That doesn’t look like a YouTube link." }, { status: 400 });
  }

  const cached = getCachedAnalysis(videoId);
  const stream = new ReadableStream({
    async start(controller) {
      const send = (packet: StreamPacket) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(packet)}\n\n`));
      };
      try {
        if (cached) {
          send({ type: "event", stage: "resolve", message: "Cache hit — skipping the model", at: 0 });
          send({ type: "event", stage: "done", message: "Ready.", at: 80 });
          send({ type: "result", analysis: cached });
          controller.close();
          return;
        }
        for await (const packet of runAnalysis(videoId, body.niche ?? "finance")) {
          send(packet);
          if (packet.type === "result") setCachedAnalysis(videoId, packet.analysis);
        }
      } catch (error) {
        send({
          type: "error",
          message: error instanceof Error ? error.message : "Analysis failed",
        });
      } finally {
        controller.close();
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
