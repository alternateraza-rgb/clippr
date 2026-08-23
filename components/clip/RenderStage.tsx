"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { usePrefersReducedMotion } from "@/components/motion/usePrefersReducedMotion";
import { base } from "@/components/motion/presets";
import { cn } from "@/lib/cn";

export type StageId = "read" | "transcribe" | "choose" | "cut" | "edit" | "done";

/**
 * `at` is the progress value this stage begins at, so the rail and the bar are
 * driven by the same numbers the worker actually reports.
 */
const STAGES: { id: StageId; label: string; detail: string; at: number }[] = [
  { id: "read", label: "Reading the video", detail: "Pulling the tape and its metadata", at: 0 },
  { id: "transcribe", label: "Listening to all of it", detail: "Every word, with timings", at: 8 },
  { id: "choose", label: "Finding the best minute", detail: "Comparing the strongest moments", at: 20 },
  { id: "cut", label: "Pulling the clip", detail: "Downloading just that window", at: 30 },
  { id: "edit", label: "Editing", detail: "Cuts, framing, captions on the beat", at: 48 },
];

const ORDER: StageId[] = ["read", "transcribe", "choose", "cut", "edit", "done"];

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

export function RenderStage({
  stage,
  progress,
  note,
  className,
}: {
  stage: StageId;
  /** 0-100, from the render row. */
  progress: number;
  note?: string;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const activeIndex = ORDER.indexOf(stage);
  const elapsed = useElapsed(stage !== "done");

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-panel,22px)] bg-surface shadow-lift",
        className,
      )}
    >
      {/* Brand light behind the panel, drifting. The landing page uses the same
          gradient — it is the one piece of decoration the app owns. */}
      {!reduced ? (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-28 h-[320px] w-[320px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(196,90,102,0.30), rgba(143,36,48,0.10) 45%, rgba(253,252,252,0) 72%)",
          }}
          animate={{ x: [0, 20, -10, 0], y: [0, 14, -8, 0], opacity: [0.75, 1, 0.8] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : null}

      <div className="relative p-7 md:p-9">
        <div className="flex items-baseline justify-between gap-4">
          <p className="eyebrow text-brand">Making your clip</p>
          <p className="tnum text-[12px] text-muted">
            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
          </p>
        </div>

        <h2 className="display mt-3 text-[24px] text-ink">
          {stage === "done" ? "Ready" : "This takes a minute or two"}
        </h2>

        <div className="mt-6 h-[3px] w-full overflow-hidden rounded-full bg-surface-warm-alt">
          <motion.div
            className="h-full rounded-full bg-brand"
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(2, Math.min(100, progress))}%` }}
            transition={{ duration: reduced ? 0 : 0.8, ease: [0.2, 0.8, 0.2, 1] }}
          />
        </div>

        <ol className="mt-7 space-y-1">
          {STAGES.map((item, i) => {
            const done = activeIndex > i;
            const active = activeIndex === i;
            return (
              <li
                key={item.id}
                className={cn(
                  "flex items-start gap-3 rounded-[var(--radius-control,10px)] px-3 py-2.5 transition-colors",
                  active && "bg-surface-warm/70",
                )}
              >
                <span className="relative mt-[2px] flex h-[18px] w-[18px] shrink-0 items-center justify-center">
                  {done ? (
                    <motion.span
                      initial={reduced ? false : { scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={base}
                      className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-brand"
                    >
                      <Check className="h-3 w-3 text-on-brand" strokeWidth={3} />
                    </motion.span>
                  ) : active ? (
                    <>
                      {!reduced ? (
                        <motion.span
                          className="absolute h-[18px] w-[18px] rounded-full bg-brand"
                          animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
                          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                        />
                      ) : null}
                      <span className="relative h-[9px] w-[9px] rounded-full bg-brand" />
                    </>
                  ) : (
                    <span className="h-[7px] w-[7px] rounded-full bg-hairline" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-[14.5px] transition-colors",
                      active ? "font-medium text-ink" : done ? "text-body" : "text-muted",
                    )}
                  >
                    {item.label}
                  </p>
                  {active ? (
                    <motion.p
                      key={note || item.detail}
                      className="mt-1 line-clamp-2 text-[13px] text-muted"
                      initial={reduced ? false : { opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={base}
                    >
                      {note || item.detail}
                    </motion.p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>

        <p className="mt-6 border-t border-hairline pt-5 text-[13px] text-muted">
          You can leave this page — the clip downloads on its own when it is done.
        </p>
      </div>
    </div>
  );
}

/** Progress floor for a stage, so the bar never sits still while work happens. */
export function progressFor(stage: StageId) {
  return STAGES.find((s) => s.id === stage)?.at ?? 0;
}
