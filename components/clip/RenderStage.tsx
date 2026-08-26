"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/components/motion/usePrefersReducedMotion";
import { thumbnailFor } from "@/lib/youtube";
import { cn } from "@/lib/cn";

export type StageId = "read" | "transcribe" | "choose" | "cut" | "edit" | "done";

/**
 * `at` is the progress value this stage begins at, so the rail and the bar are
 * driven by the same numbers the worker actually reports.
 */
const STAGES: { id: StageId; label: string; detail: string; short: string; at: number }[] = [
  {
    id: "read",
    label: "Reading the video",
    detail: "Pulling the tape and its metadata",
    short: "Read",
    at: 0,
  },
  {
    id: "transcribe",
    label: "Listening to all of it",
    detail: "Every word, timed to the audio",
    short: "Listen",
    at: 8,
  },
  {
    id: "choose",
    label: "Deciding what it is about",
    detail: "Picking a topic and the moments that tell it",
    short: "Choose",
    at: 20,
  },
  {
    id: "cut",
    label: "Gathering the moments",
    detail: "Pulling each piece off the tape",
    short: "Cut",
    at: 30,
  },
  {
    id: "edit",
    label: "Editing",
    detail: "Framing, punch-ins, captions on the beat",
    short: "Edit",
    at: 48,
  },
];

const ORDER: StageId[] = ["read", "transcribe", "choose", "cut", "edit", "done"];

/** Deterministic bar heights, so the waveform belongs to this video. */
function waveform(seed: string, count: number) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Array.from({ length: count }, (_, i) => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    const base = ((h >>> 0) % 100) / 100;
    // Speech sits in a band rather than spanning the full range; a waveform
    // that touches 0 and 1 every other bar reads as random noise.
    const envelope = 0.45 + 0.4 * Math.sin((i / count) * Math.PI * 3.1);
    return Math.max(0.12, Math.min(1, base * 0.55 + envelope * 0.6));
  });
}

function useElapsed(active: boolean) {
  const [seconds, setSeconds] = useState(0);
  const started = useRef(0);
  useEffect(() => {
    if (!active) return;
    // Clock reads belong in the effect, not in render.
    if (!started.current) started.current = Date.now();
    const timer = setInterval(
      () => setSeconds(Math.floor((Date.now() - started.current) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, [active]);
  return seconds;
}

const CAPTION_BEATS = ["THIS IS THE", "PART NOBODY", "TALKS ABOUT"];

export function RenderStage({
  stage,
  progress,
  note,
  videoId,
  eyebrow = "Making your clip",
  className,
}: {
  stage: StageId;
  /** 0-100, from the render row. */
  progress: number;
  note?: string;
  videoId?: string;
  /** The panel fronts both the search for a cut and the render of one. */
  eyebrow?: string;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const index = ORDER.indexOf(stage);
  const elapsed = useElapsed(stage !== "done");
  const bars = useMemo(() => waveform(videoId ?? "clipmuse", 56), [videoId]);
  const current = STAGES[Math.min(index, STAGES.length - 1)];

  // Past "choose" the tape stops being a 16:9 source and becomes the vertical
  // clip being built. The frame narrowing is the whole story of the product.
  const vertical = index >= ORDER.indexOf("cut");
  const pct = Math.max(2, Math.min(100, progress));

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--radius-panel)] bg-void text-white",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4 px-6 pt-6">
        <p className="eyebrow text-brand">{eyebrow}</p>
        <p className="tnum text-[12.5px] text-white/45">
          {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
        </p>
      </div>

      {/* The tape */}
      <div className="px-6 pt-6">
        <motion.div
          className="relative mx-auto overflow-hidden rounded-[14px] bg-black"
          animate={{ maxWidth: vertical ? 232 : 640, aspectRatio: vertical ? 9 / 16 : 16 / 9 }}
          initial={false}
          transition={
            reduced ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 24, mass: 1 }
          }
          style={{ width: "100%" }}
        >
          {videoId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailFor(videoId)}
              alt=""
              className={cn(
                "absolute inset-0 h-full w-full object-cover transition-all duration-[1200ms] ease-[var(--ease-out-soft)]",
                index >= ORDER.indexOf("choose") ? "opacity-70 saturate-100" : "opacity-45 saturate-50",
                vertical && "scale-[1.9]",
              )}
            />
          ) : (
            <div className="absolute inset-0 bg-void-soft" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

          {/* Reading: a single line sweeps the tape. */}
          {stage === "read" && !reduced ? (
            <motion.div
              aria-hidden
              className="absolute inset-y-0 w-[2px] bg-brand shadow-[0_0_24px_6px_rgb(255_74_23/0.55)]"
              animate={{ left: ["-2%", "102%"] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
          ) : null}

          {/* Listening: the waveform is the work. */}
          <AnimatePresence>
            {stage === "transcribe" ? (
              <motion.div
                key="wave"
                className="absolute inset-x-0 bottom-0 flex h-[46%] items-end gap-[2px] px-4 pb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {bars.map((height, i) => (
                  <motion.span
                    key={i}
                    className="flex-1 rounded-full bg-white/85"
                    style={{ height: `${height * 100}%` }}
                    animate={reduced ? undefined : { scaleY: [1, 0.35, 1] }}
                    transition={
                      reduced
                        ? undefined
                        : {
                            duration: 1.1,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: (i % 14) * 0.06,
                          }
                    }
                  />
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Editing: what actually gets burned in. */}
          <AnimatePresence>
            {stage === "edit" || stage === "done" ? (
              <motion.div
                key="caption"
                className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 p-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {CAPTION_BEATS.map((line, i) => (
                  <motion.span
                    key={line}
                    className="font-caption rounded-[6px] bg-black px-2 py-0.5 text-[13px] uppercase leading-tight tracking-[-0.03em] text-white"
                    initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: reduced ? 0 : 0.25 + i * 0.22, type: "spring", stiffness: 420, damping: 22 }}
                  >
                    {line}
                  </motion.span>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>

        {/* The window on the source, narrowing to the chosen span. */}
        <div className="relative mx-auto mt-4 h-[5px] max-w-[640px] overflow-hidden rounded-full bg-white/12">
          <motion.div
            className="absolute inset-y-0 rounded-full bg-brand"
            initial={false}
            animate={
              index >= ORDER.indexOf("choose")
                ? { left: "34%", right: "48%" }
                : { left: "0%", right: "0%" }
            }
            transition={reduced ? { duration: 0 } : { duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }}
            style={{ opacity: index >= ORDER.indexOf("choose") ? 1 : 0.25 }}
          />
        </div>
      </div>

      {/* What it is doing, in one line. */}
      <div className="px-6 pb-6 pt-7">
        <AnimatePresence mode="wait">
          <motion.div
            key={stage}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <h2 className="display text-[24px] text-white md:text-[27px]">
              {stage === "done" ? "Ready" : current.label}
            </h2>
            <p className="mt-2 line-clamp-2 min-h-[21px] text-[14.5px] text-white/55">
              {note || current.detail}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* The rail: where you are, without a five-row checklist. */}
        <ol className="mt-7 flex items-center gap-1.5">
          {STAGES.map((item, i) => {
            const done = index > i;
            const active = index === i;
            return (
              <li key={item.id} className="flex min-w-0 flex-1 flex-col gap-2">
                <span className="h-[3px] overflow-hidden rounded-full bg-white/12">
                  <motion.span
                    className="block h-full rounded-full bg-brand"
                    initial={false}
                    animate={{ width: done ? "100%" : active ? "55%" : "0%" }}
                    transition={{ duration: reduced ? 0 : 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                  />
                </span>
                <span
                  className={cn(
                    "truncate text-[11px] font-medium transition-colors",
                    active ? "text-white" : done ? "text-white/50" : "text-white/25",
                  )}
                >
                  {item.short}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="h-[3px] w-full bg-white/10">
        <motion.div
          className="h-full bg-brand"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: reduced ? 0 : 0.8, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </div>
    </div>
  );
}

/** Progress floor for a stage, so the bar never sits still while work happens. */
export function progressFor(stage: StageId) {
  return STAGES.find((s) => s.id === stage)?.at ?? 0;
}
