import { captionLinesForRange } from "@/lib/agent/compose";
import { scoreTranscript } from "@/lib/agent/score";
import { CaptionsDisabledError, fetchTranscript } from "@/lib/agent/transcript";
import type { AgentEvent, AgentStage, AnalysisResult, Niche } from "@/lib/agent/types";
import { hasLlm, isDemoMode, workerUrl, hasSupadata } from "@/lib/config";
import { analysisFor } from "@/lib/fixtures/analyses";
import { formatDuration } from "@/lib/format";
import { fetchSupadataTranscript } from "@/lib/ingest/supadata";
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
  | { type: "error"; message: string }
  | { type: "pending"; message: string };

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForTranscript(videoId: string, tries = 4) {
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
  opts?: { bypassCache?: boolean },
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
    const persisted = opts?.bypassCache ? null : await readAnalysisCache(videoId);
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

    if (!transcript?.words.length && hasSupadata()) {
      yield emit("transcribe", "Fetching transcript in the cloud (Supadata)…");
      transcript = await fetchSupadataTranscript(videoId);
      if (transcript?.words.length) await writeTranscriptCache(videoId, transcript);
    }

    if (!transcript?.words.length && workerUrl()) {
      yield emit("transcribe", "No captions on Vercel — sending audio to the worker…");
      const ping = await requestTranscribe(videoId, 20_000);
      if (ping.ok) {
        yield emit("transcribe", "Waiting on Whisper / auto-captions (Render may be waking up)…");
        transcript = await waitForTranscript(videoId);
      } else if (ping.reason === "not_configured") {
        yield {
          type: "error",
          message: "Set CLIP_WORKER_URL and CLIP_WORKER_SECRET so we can transcribe when YouTube blocks captions.",
        };
        return;
      } else {
        yield emit("transcribe", "Worker is waking up — Studio will keep polling…");
      }
    }

    if (!transcript?.words.length) {
      if (workerUrl()) {
        yield emit("transcribe", "Still transcribing on the worker. Studio will wait…");
        yield {
          type: "pending",
          message: "Worker is transcribing. This can take a few minutes.",
        };
        return;
      }
      yield {
        type: "error",
        message: hasSupadata()
          ? "Supadata could not return a transcript for this video. Check credits and that the video is public."
          : "Could not get captions. Set SUPADATA_API_KEY (cloud) on Vercel.",
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
    if (hasLlm() && meta.source !== "llm") {
      yield {
        type: "error",
        message: "LLM scoring did not run. Check LLM_API_KEY on Vercel.",
      };
      return;
    }
    const filled = candidates.map((c) => ({
      ...c,
      captionLines: c.captionLines.length
        ? c.captionLines
        : captionLinesForRange(transcript.words, c.start, c.end),
    }));
    if (!filled.length) {
      yield { type: "error", message: "No clip windows came back from scoring." };
      return;
    }
    const top = filled[0];
    if (top) {
      yield emit(
        "score",
        `Found a ${Math.round(top.end - top.start)}s hook at ${fmt(top.start)} — “${top.hook.slice(0, 72)}”`,
      );
    }
    // One clip ships. The others exist only so the model had something to
    // compare against — showing them was what made the old flow a menu of
    // previews nobody could actually preview.
    const winner = [filled[0]];
    yield emit("compose", `Locked the cut · ${meta.source} · ${meta.ms}ms`);
    yield emit("done", "Ready.");

    const analysis: AnalysisResult = {
      video,
      candidates: winner,
      events: [...events],
      scoreSource: meta.source,
    };
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
