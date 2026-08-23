"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RenderStage, type StageId } from "@/components/clip/RenderStage";
import { Field } from "@/components/ui/Field";
import { Pill } from "@/components/ui/Pill";
import { parseYouTubeId } from "@/lib/youtube";
import { clipFilename, downloadBlobUrl, markDownloaded } from "@/lib/download";
import { useProfile } from "@/lib/store/profile";
import type { AnalysisResult, ClipCandidate } from "@/lib/agent/types";

type Phase = "idle" | "working" | "done";

function StudioInner() {
  const params = useSearchParams();
  const { profile } = useProfile();
  const initialId = params.get("v") ?? parseYouTubeId(params.get("url") ?? "") ?? "";
  const abort = useRef<AbortController | null>(null);

  const [raw, setRaw] = useState(initialId ? `https://www.youtube.com/watch?v=${initialId}` : "");
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [stage, setStage] = useState<StageId>("read");
  const [note, setNote] = useState("");
  const [clip, setClip] = useState<{ url: string; hook: string } | null>(null);

  const videoId = parseYouTubeId(raw);

  /**
   * Reads the analysis stream and returns the one clip the model picked, or
   * null when the transcript is still being made on the worker.
   */
  async function consumeAnalyze(id: string, controller: AbortController) {
    const res = await fetch("/api/studio/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ videoId: id, niche: profile.niche }),
      signal: controller.signal,
    });
    if (!res.ok || !res.body) {
      const payload = await res.json().catch(() => ({}));
      throw new Error((payload as { message?: string }).message || "Could not analyze that video.");
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let pending = false;
    let winner: ClipCandidate | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";
      for (const chunk of chunks) {
        const line = chunk.split("\n").find((l) => l.startsWith("data: "));
        if (!line) continue;
        const packet = JSON.parse(line.slice(6)) as {
          type: string;
          stage?: string;
          message?: string;
          analysis?: AnalysisResult;
        };
        if (packet.type === "event" && packet.stage) {
          if (packet.stage === "resolve") setStage("read");
          if (packet.stage === "transcribe") setStage("transcribe");
          if (packet.stage === "score" || packet.stage === "compose") setStage("choose");
          if (packet.message) setNote(packet.message);
        }
        if (packet.type === "error") throw new Error(packet.message || "Analysis failed");
        if (packet.type === "pending") {
          pending = true;
          if (packet.message) setNote(packet.message);
        }
        if (packet.type === "result" && packet.analysis) {
          winner = packet.analysis.candidates[0] ?? null;
        }
      }
    }
    if (winner) return winner;
    if (pending) return null;
    throw new Error("Analysis ended without a result.");
  }

  /** The worker is making a transcript; wait for it, then analyse again. */
  async function waitForWorkerTranscript(id: string, controller: AbortController) {
    await fetch("/api/studio/transcript", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ videoId: id }),
      signal: controller.signal,
    }).catch(() => null);

    const deadline = Date.now() + 10 * 60_000;
    while (Date.now() < deadline) {
      if (controller.signal.aborted) throw new DOMException("Aborted", "AbortError");
      const res = await fetch(`/api/studio/transcript?videoId=${encodeURIComponent(id)}`, {
        signal: controller.signal,
      });
      const data = (await res.json()) as { ready?: boolean; status?: string; error?: string | null };
      if (data.ready) return;
      if (data.status === "failed") throw new Error(data.error || "Transcribing failed.");
      setNote("Listening to the whole video…");
      await new Promise((r) => setTimeout(r, 3000));
    }
    throw new Error("Transcript timed out.");
  }

  async function renderClip(id: string, candidate: ClipCandidate, controller: AbortController) {
    setStage("cut");
    setNote(candidate.hook ? `“${candidate.hook.slice(0, 70)}”` : "");

    const res = await fetch("/api/studio/export", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        videoId: id,
        start: candidate.start,
        end: candidate.end,
        captionLines: candidate.captionLines,
        gameplay: profile.defaultGameplay,
        captionPreset: profile.captionPreset,
        candidate,
      }),
      signal: controller.signal,
    });
    const payload = (await res.json().catch(() => ({}))) as {
      renderId?: string;
      message?: string;
    };
    if (!payload.renderId) throw new Error(payload.message || "Could not start the render.");

    const deadline = Date.now() + 12 * 60_000;
    while (Date.now() < deadline) {
      if (controller.signal.aborted) throw new DOMException("Aborted", "AbortError");
      const poll = await fetch(`/api/studio/renders/${payload.renderId}`, { signal: controller.signal });
      const data = (await poll.json()) as {
        render?: { status: string; error?: string | null; downloadUrl?: string | null };
      };
      const render = data.render;
      if (render?.status === "ready" && render.downloadUrl) {
        markDownloaded(payload.renderId);
        setClip({ url: render.downloadUrl, hook: candidate.hook });
        setStage("done");
        setPhase("done");
        // The shell downloads finished clips too, but only on its own poll —
        // firing here means the file lands the moment the page knows.
        await downloadBlobUrl(render.downloadUrl, clipFilename(id, payload.renderId)).catch(() => null);
        return;
      }
      if (render?.status === "failed") throw new Error(render.error || "Render failed.");
      if (render?.status === "downloading") setStage("cut");
      if (render?.status === "transcribing" || render?.status === "scoring") {
        setStage("edit");
        setNote("Timing every word to the audio…");
      }
      if (render?.status === "rendering") {
        setStage("edit");
        setNote("Cuts, framing, captions on the beat…");
      }
      await new Promise((r) => setTimeout(r, 2500));
    }
    throw new Error("This is taking unusually long. Check Library in a few minutes.");
  }

  async function start(id: string) {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setError("");
    setClip(null);
    setNote("");
    setStage("read");
    setPhase("working");

    try {
      let winner = await consumeAnalyze(id, controller);
      if (!winner) {
        await waitForWorkerTranscript(id, controller);
        winner = await consumeAnalyze(id, controller);
      }
      if (!winner) throw new Error("No clip could be cut from this video.");
      await renderClip(id, winner, controller);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setPhase("idle");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  function submit() {
    if (!videoId) {
      setError("That doesn’t look like a YouTube link.");
      return;
    }
    void start(videoId);
  }

  useEffect(() => {
    if (!initialId) return;
    queueMicrotask(() => void start(initialId));
    return () => abort.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialId]);

  return (
    <div className="mx-auto max-w-[560px]">
      <p className="text-[13px] font-medium text-muted">Studio</p>
      <h1 className="display mt-2 text-[28px] text-ink">Cut the moment</h1>

      {phase === "idle" ? (
        <>
          <p className="mt-2 max-w-[44ch] text-body">
            Paste a longform YouTube link. We watch the whole thing, pick the
            strongest minute, and edit it into a vertical clip.
          </p>
          <div className="mt-6">
            <Field
              value={raw}
              onChange={(v) => {
                setRaw(v);
                setError("");
              }}
              onSubmit={submit}
              placeholder="Paste a long YouTube link (8+ min)"
            />
          </div>
          {error ? <p className="mt-3 text-[13px] text-brand">{error}</p> : null}
          <Pill className="mt-4" onClick={submit}>
            Make my clip
          </Pill>
        </>
      ) : null}

      {phase === "working" ? <RenderStage className="mt-8" stage={stage} note={note} /> : null}

      {phase === "done" && clip ? (
        <div className="mt-8">
          {/* The real rendered file, not a YouTube embed pretending to be one. */}
          <video
            src={clip.url}
            controls
            autoPlay
            playsInline
            className="w-full rounded-[16px] bg-black shadow-hairline"
          />
          {clip.hook ? (
            <p className="mt-4 text-[15px] text-ink">“{clip.hook}”</p>
          ) : null}
          <p className="mt-2 text-[13px] text-muted">
            Downloaded to your device. It is in your Library too.
          </p>
          <Pill
            className="mt-5"
            onClick={() => {
              setPhase("idle");
              setRaw("");
              setClip(null);
            }}
          >
            Cut another
          </Pill>
        </div>
      ) : null}
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={null}>
      <StudioInner />
    </Suspense>
  );
}
