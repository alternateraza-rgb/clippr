"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { RenderStage, progressFor, type StageId } from "@/components/clip/RenderStage";
import { PageHeader } from "@/components/app/PageHeader";
import { usePrefersReducedMotion } from "@/components/motion/usePrefersReducedMotion";
import { base } from "@/components/motion/presets";
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
  const [clip, setClip] = useState<{
    url: string;
    poster: string | null;
    hook: string;
    topic: string;
    why: string;
    segments: number;
  } | null>(null);

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
        setClip({
          url: render.downloadUrl,
          poster: render.posterUrl ?? null,
          hook: candidate.hook,
          topic: candidate.topic ?? "",
          why: candidate.whyItClips ?? "",
          segments: candidate.segments?.length ?? 1,
        });
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
    <div className="mx-auto max-w-[680px] pb-4">
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

            <div className="mt-8 rounded-[var(--radius-panel)] bg-void p-6 text-white md:p-7">
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <input
                  value={raw}
                  onChange={(e) => {
                    setRaw(e.target.value);
                    setError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submit();
                  }}
                  placeholder="Paste a long YouTube link (8+ min)"
                  aria-label="YouTube link"
                  className="min-w-0 flex-1 rounded-[var(--radius-pill)] bg-white/10 px-5 py-3.5 text-[15px] text-white outline-none ring-1 ring-inset ring-white/15 transition-shadow placeholder:text-white/40 focus:ring-2 focus:ring-white/60"
                />
                <button
                  type="button"
                  onClick={submit}
                  className="shrink-0 rounded-[var(--radius-pill)] bg-brand px-7 py-3.5 text-[15px] font-semibold text-on-brand shadow-[inset_0_1px_0_rgb(255_255_255/0.22)] transition-colors hover:bg-brand-hover active:scale-[0.98]"
                >
                  Clip it
                </button>
              </div>

              {error ? (
                <motion.p
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 text-[13.5px] text-brand-tint"
                >
                  {error}
                </motion.p>
              ) : null}

              <p className="mt-4 text-[12.5px] text-white/40">
                One clip per video — the best 50 to 60 seconds on the tape.
              </p>
            </div>

            <ol className="mt-8 grid gap-px overflow-hidden rounded-[var(--radius-card)] bg-hairline sm:grid-cols-3">
              {[
                ["Listens", "Every word, timed to the audio."],
                ["Chooses", "The topic, and the moments that tell it."],
                ["Edits", "Framed vertical, captions burned in."],
              ].map(([title, body]) => (
                <li key={title} className="bg-surface p-5">
                  <p className="text-[13.5px] font-semibold text-ink">{title}</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{body}</p>
                </li>
              ))}
            </ol>
          </motion.div>
        ) : null}

        {phase === "working" ? (
          <motion.div
            key="working"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
            transition={base}
          >
            <RenderStage
              stage={stage}
              progress={progress}
              note={note}
              videoId={videoId ?? undefined}
            />
            <p className="mt-5 text-center text-[13px] text-muted">
              You can leave this page — the clip downloads on its own when it is done.
            </p>
          </motion.div>
        ) : null}

        {phase === "done" && clip ? (
          <motion.div
            key="done"
            className="flex flex-col items-center"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={
              reduced ? base : { type: "spring", stiffness: 260, damping: 26, mass: 0.9 }
            }
          >
            <motion.p
              className="eyebrow text-brand"
              initial={reduced ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...base, delay: 0.12 }}
            >
              Your clip is ready
            </motion.p>

            <video
              src={clip.url}
              poster={clip.poster ?? undefined}
              controls
              autoPlay
              loop
              playsInline
              className="mt-5 max-h-[58vh] rounded-[var(--radius-panel)] bg-black shadow-pop"
            />

            <motion.div
              className="mt-7 w-full max-w-[46ch] text-center"
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...base, delay: 0.24 }}
            >
              {clip.topic ? (
                <h2 className="display text-[21px] leading-snug text-ink">{clip.topic}</h2>
              ) : clip.hook ? (
                <h2 className="display text-[21px] leading-snug text-ink">
                  &ldquo;{clip.hook}&rdquo;
                </h2>
              ) : null}

              {clip.why ? (
                <p className="mt-3 text-[14.5px] leading-relaxed text-body">{clip.why}</p>
              ) : null}

              {clip.segments > 1 ? (
                <p className="mt-3 text-[12.5px] text-muted">
                  Built from {clip.segments} moments across the video
                </p>
              ) : null}
            </motion.div>

            <motion.div
              className="mt-7 flex items-center gap-3"
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...base, delay: 0.32 }}
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
              <Pill variant="outline" href="/app/library">
                Open Library
              </Pill>
            </motion.div>

            <p className="mt-4 text-[12.5px] text-muted">
              Saved to your device and your Library.
            </p>
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
