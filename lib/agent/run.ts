import { captionLinesForRange } from "@/lib/agent/compose";
import { heuristicCandidates } from "@/lib/agent/heuristic";
import { scoreTranscript } from "@/lib/agent/score";
import { CaptionsDisabledError, fetchTranscript } from "@/lib/agent/transcript";
import type { AgentEvent, AgentStage, AnalysisResult, Niche } from "@/lib/agent/types";
import { isDemoMode, workerUrl } from "@/lib/config";
import { analysisFor } from "@/lib/fixtures/analyses";
import { formatDuration } from "@/lib/format";
import {
  readAnalysisCache,
  readTranscriptCache,
  readVideoCache,
  writeAnalysisCache,
  writeTranscriptCache,
  writeVideoCache,
} from "@/lib/supabase/cache";
import { requestTranscribe } from "@/lib/worker/client";
import { hydrateVideo } from "@/lib/youtube/meta";

export type StreamPacket =
  | { type: "event"; stage: AgentStage; message: string; at: number }
  | { type: "result"; analysis: AnalysisResult }
  | { type: "error"; message: string };

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForTranscript(videoId: string, tries = 24) {
  for (let i = 0; i < tries; i++) {
    const hit = await readTranscriptCache(videoId);
    if (hit?.words.length) return hit;
    await sleep(2500);
  }
  return null;
}

export async function* runAnalysis(
  videoId: string,
  niche: Niche = "finance",
): AsyncGenerator<StreamPacket> {
  const t0 = Date.now();
  const events: AgentEvent[] = [];
  const emit = (stage: AgentStage, message: string): StreamPacket => {
    const packet: StreamPacket = { type: "event", stage, message, at: Date.now() - t0 };
    events.push({ stage, message, at: packet.at });
    return packet;
  };

  if (isDemoMode()) {
    const demo = analysisFor(videoId);
    for (const event of demo.events) {
      yield { type: "event", ...event };
    }
    yield { type: "result", analysis: demo };
    return;
  }

  try {
    const persisted = await readAnalysisCache(videoId);
    if (persisted) {
      yield emit("resolve", "Cache hit — skipping the model");
      yield emit("done", "Ready.");
      yield { type: "result", analysis: persisted };
      return;
    }

    yield emit("resolve", "Resolving the video…");
    let video = await readVideoCache(videoId);
    if (!video) {
      video = await hydrateVideo(videoId);
      await writeVideoCache(video);
    }
    if (video.durationS > 0 && video.durationS < 8 * 60) {
      yield {
        type: "error",
        message: "Need a longform video (8+ minutes). Shorts and clips this short cannot be scored.",
      };
      return;
    }
    yield emit(
      "resolve",
      `Resolved · ${video.durationS ? formatDuration(video.durationS) : "live metadata"} · ${video.channel}`,
    );

    yield emit("transcribe", "Pulling captions…");
    let transcript = await readTranscriptCache(videoId);
    if (!transcript) {
      transcript = await fetchTranscript(videoId).catch((error) => {
        if (error instanceof CaptionsDisabledError) return null;
        throw error;
      });
      if (transcript?.words.length) await writeTranscriptCache(videoId, transcript);
    }

    if (!transcript?.words.length && workerUrl()) {
      yield emit("transcribe", "No captions on Vercel — sending audio to the worker…");
      const ping = await requestTranscribe(videoId);
      if (!ping.ok) {
        yield {
          type: "error",
          message:
            ping.reason === "not_configured"
              ? "Set CLIP_WORKER_URL so we can transcribe when YouTube blocks captions."
              : `Worker did not accept transcribe (${ping.reason}).`,
        };
        return;
      }
      yield emit("transcribe", "Waiting on Whisper / auto-captions (Render may be waking up)…");
      transcript = await waitForTranscript(videoId);
    }

    if (!transcript?.words.length) {
      yield {
        type: "error",
        message:
          "Could not get a transcript. The worker downloads captions or Whisper on the first 10 minutes — check Render logs and CLIP_WORKER_URL.",
      };
      return;
    }

    video.captionsAvailable = true;
    await writeVideoCache(video);
    yield emit(
      "transcribe",
      `${transcript.words.length.toLocaleString()} words · ${transcript.language} · ${transcript.source}`,
    );

    yield emit("score", "Scoring windows against the retention rubric");
    const { candidates, meta } = await scoreTranscript(transcript, niche);
    const filled = (candidates.length ? candidates : heuristicCandidates(transcript.words)).map(
      (c) => ({
        ...c,
        captionLines: c.captionLines.length
          ? c.captionLines
          : captionLinesForRange(transcript.words, c.start, c.end),
      }),
    );
    const top = filled[0];
    if (top) {
      yield emit(
        "score",
        `Found a ${Math.round(top.end - top.start)}s hook at ${fmt(top.start)} — “${top.hook.slice(0, 72)}”`,
      );
    }
    yield emit("compose", `Composing ${filled.length} cuts · ${meta.source} · ${meta.ms}ms`);
    yield emit("done", filled.length ? "Ready." : "No strong cuts on this tape.");

    const analysis: AnalysisResult = { video, candidates: filled, events: [...events] };
    await writeAnalysisCache(videoId, analysis, {
      niche,
      model: meta.model,
      source: meta.source,
      tokens: meta.tokens,
    });
    yield { type: "result", analysis };
  } catch (error) {
    yield {
      type: "error",
      message: error instanceof Error ? error.message : "Analysis failed",
    };
  }
}

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}
