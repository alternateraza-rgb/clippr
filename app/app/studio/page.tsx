"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { RenderStage, progressFor, type StageId } from "@/components/clip/RenderStage";
import { PageHeader } from "@/components/app/PageHeader";
import { usePrefersReducedMotion } from "@/components/motion/usePrefersReducedMotion";
import { base } from "@/components/motion/presets";
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
  const [progress, setProgress] = useState(0);
  const [note, setNote] = useState("");
  const reduced = usePrefersReducedMotion();

  /** Progress is a promise to the user: it never goes backwards. */
  const advance = (value: number) => setProgress((prev) => Math.max(prev, Math.min(100, value)));
  const goTo = (next: StageId) => {
    setStage(next);
    advance(progressFor(next));
  };
  const [clip, setClip] = useState<{ url: string; poster: string | null; hook: string } | null>(null);

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
          if (packet.stage === "resolve") goTo("read");
          if (packet.stage === "transcribe") goTo("transcribe");
          if (packet.stage === "score" || packet.stage === "compose") goTo("choose");
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
    goTo("cut");
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
        render?: {
          status: string;
          progress?: number;
          error?: string | null;
          downloadUrl?: string | null;
          posterUrl?: string | null;
        };
      };
      const render = data.render;
      if (render?.status === "ready" && render.downloadUrl) {
        markDownloaded(payload.renderId);
        advance(100);
        setClip({ url: render.downloadUrl, poster: render.posterUrl ?? null, hook: candidate.hook });
        setStage("done");
        setPhase("done");
        // The shell downloads finished clips too, but only on its own poll —
        // firing here means the file lands the moment the page knows.
        await downloadBlobUrl(render.downloadUrl, clipFilename(id, payload.renderId)).catch(() => null);
        return;
      }
      if (render?.status === "failed") throw new Error(render.error || "Render failed.");

      // The worker's own progress is the source of truth; each status gets its
      // own stage rather than collapsing three of them into "Editing".
      if (typeof render?.progress === "number") advance(render.progress);
      if (render?.status === "downloading") {
        goTo("cut");
        setNote("Pulling just the clip window…");
      }
      if (render?.status === "transcribing") {
        goTo("edit");
        setNote("Timing every word to the audio…");
      }
      if (render?.status === "rendering") {
        goTo("edit");
        const p = render.progress ?? 0;
        setNote(
          p >= 90
            ? "Saving your clip…"
            : p >= 70
              ? "Burning captions and rendering…"
              : p >= 55
                ? "Framing on the speaker…"
                : "Planning the cuts…",
        );
      }
      await new Promise((r) => setTimeout(r, 2000));
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
    setProgress(0);
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
    <div className="mx-auto max-w-[600px]">
      {/* Deliberately not mode="wait": that holds the next screen until the
          previous one finishes exiting, so anything that stalls an exit
          animation — a backgrounded tab, a throttled frame loop — leaves the
          user staring at the screen they already left. */}
      <AnimatePresence>
        {phase === "idle" ? (
          <motion.div
            key="idle"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={base}
          >
            <PageHeader
              eyebrow="Studio"
              title="Cut the moment"
              lede="Paste a longform YouTube link. We watch the whole thing, pick the strongest minute, and edit it into a vertical clip."
            />
            <div className="mt-8">
              <Field
                value={raw}
                onChange={(v) => {
                  setRaw(v);
                  setError("");
                }}
                onSubmit={submit}
                submitLabel="Clip it"
                placeholder="Paste a long YouTube link (8+ min)"
              />
            </div>
            {error ? (
              <motion.p
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 text-[13px] text-brand"
              >
                {error}
              </motion.p>
            ) : null}
            <p className="mt-8 text-[13px] text-muted">
              One clip per video — the best 50 to 60 seconds on the tape.
            </p>
          </motion.div>
        ) : null}

        {phase === "working" ? (
          <motion.div
            key="working"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
            transition={base}
          >
            <RenderStage stage={stage} progress={progress} note={note} />
          </motion.div>
        ) : null}

        {phase === "done" && clip ? (
          <motion.div
            key="done"
            className="flex flex-col items-center"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={
              reduced ? base : { type: "spring", stiffness: 260, damping: 26, mass: 0.9 }
            }
          >
            <motion.p
              className="eyebrow text-brand"
              initial={reduced ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...base, delay: 0.15 }}
            >
              Your clip is ready
            </motion.p>

            <div className="relative mt-5">
              {/* The glow lands a beat after the video, so the reveal has a
                  second act rather than everything arriving at once. */}
              {!reduced ? (
                <motion.div
                  aria-hidden
                  className="absolute -inset-6 rounded-[32px] blur-2xl"
                  style={{
                    background:
                      "radial-gradient(circle at 50% 40%, rgba(196,90,102,0.35), rgba(253,252,252,0) 70%)",
                  }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.9, delay: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
                />
              ) : null}
              <video
                src={clip.url}
                poster={clip.poster ?? undefined}
                controls
                autoPlay
                loop
                playsInline
                className="relative max-h-[62vh] rounded-[var(--radius-panel,22px)] bg-black shadow-pop"
              />
            </div>

            {clip.hook ? (
              <motion.p
                className="mt-6 max-w-[40ch] text-center text-[15px] leading-snug text-ink"
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...base, delay: 0.3 }}
              >
                “{clip.hook}”
              </motion.p>
            ) : null}

            <motion.div
              className="mt-6 flex items-center gap-3"
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...base, delay: 0.38 }}
            >
              <Pill
                onClick={() => {
                  setPhase("idle");
                  setRaw("");
                  setClip(null);
                  setProgress(0);
                }}
              >
                Cut another
              </Pill>
              <Pill variant="ghost" href="/app/library">
                Open Library
              </Pill>
            </motion.div>

            <p className="mt-4 text-[12.5px] text-muted">Saved to your device and your Library.</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
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
