import { captionLinesForRange } from "@/lib/agent/compose";
import { heuristicCandidates } from "@/lib/agent/heuristic";
import { scoreTranscript } from "@/lib/agent/score";
import { CaptionsDisabledError, fetchTranscript } from "@/lib/agent/transcript";
import type { AgentEvent, AgentStage, AnalysisResult, Niche } from "@/lib/agent/types";
import { isDemoMode } from "@/lib/config";
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
import { hydrateVideo } from "@/lib/youtube/meta";

export type StreamPacket =
  | { type: "event"; stage: AgentStage; message: string; at: number }
  | { type: "result"; analysis: AnalysisResult }
  | { type: "error"; message: string };

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
      if (transcript) await writeTranscriptCache(videoId, transcript);
    }

    if (!transcript || transcript.source === "none" || !transcript.words.length) {
      video.captionsAvailable = false;
      await writeVideoCache(video);
      if (!transcript || transcript.source !== "none") {
        await writeTranscriptCache(videoId, {
          segments: [],
          words: [],
          language: "en",
          source: "none",
        });
      }
      yield emit("transcribe", "Captions are disabled on this video");
      yield emit("score", "Falling back to a chapter-less heuristic");
      yield emit("done", "Ready. No spoken captions.");
      yield {
        type: "result",
        analysis: {
          video,
          events,
          candidates: [
            {
              id: "nc-1",
              start: 0,
              end: 24,
              hook: "No transcript — open on the first 24 seconds",
              whyItClips:
                "Captions were disabled. Karaoke will be empty; this is a starting cut, not a scored recommendation.",
              score: 52,
              scores: {
                hook: 50,
                emotion: 40,
                selfContained: 70,
                quotability: 30,
                payoff: 55,
              },
              captionLines: [],
            },
          ],
        },
      };
      return;
    }

    video.captionsAvailable = true;
    yield emit(
      "transcribe",
      `${transcript.words.length.toLocaleString()} words · ${transcript.language}`,
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
