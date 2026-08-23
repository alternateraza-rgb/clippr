"use client";

import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/components/motion/usePrefersReducedMotion";
import { cn } from "@/lib/cn";

export type StageId = "read" | "transcribe" | "choose" | "cut" | "edit" | "done";

const STAGES: { id: StageId; label: string; detail: string }[] = [
  { id: "read", label: "Reading the video", detail: "Pulling the tape and its metadata" },
  { id: "transcribe", label: "Listening to all of it", detail: "Every word, with timings" },
  { id: "choose", label: "Finding the best minute", detail: "Comparing the strongest moments" },
  { id: "cut", label: "Pulling the clip", detail: "Downloading just that window" },
  { id: "edit", label: "Editing", detail: "Cuts, framing, captions on the beat" },
];

const ORDER: StageId[] = ["read", "transcribe", "choose", "cut", "edit", "done"];

export function RenderStage({
  stage,
  note,
  className,
}: {
  stage: StageId;
  note?: string;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const activeIndex = ORDER.indexOf(stage);

  return (
    <div className={cn("relative overflow-hidden rounded-[16px] bg-surface p-8 shadow-hairline", className)}>
      {/* A slow sweep behind the list: enough motion to read as "working"
          without competing with the text for attention. */}
      {!reduced ? (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            background:
              "linear-gradient(115deg, transparent 20%, var(--brand, #e2483d) 50%, transparent 80%)",
          }}
          animate={{ x: ["-60%", "60%"] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : null}

      <div className="relative">
        <p className="text-[13px] font-medium text-muted">Making your clip</p>
        <h2 className="display mt-2 text-[22px] text-ink">
          {stage === "done" ? "Your clip is ready" : "This takes a minute or two"}
        </h2>

        <ol className="mt-7 space-y-4">
          {STAGES.map((item, i) => {
            const done = activeIndex > i;
            const active = activeIndex === i;
            return (
              <li key={item.id} className="flex items-start gap-3">
                <span className="relative mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center">
                  {active && !reduced ? (
                    <motion.span
                      className="absolute inset-0 rounded-full bg-brand"
                      animate={{ scale: [1, 1.55, 1], opacity: [0.45, 0, 0.45] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                    />
                  ) : null}
                  <span
                    className={cn(
                      "relative h-2 w-2 rounded-full transition-colors",
                      done ? "bg-brand" : active ? "bg-brand" : "bg-hairline",
                    )}
                  />
                </span>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-[15px] transition-colors",
                      done || active ? "text-ink" : "text-muted",
                    )}
                  >
                    {item.label}
                  </p>
                  {active ? (
                    <motion.p
                      className="mt-0.5 text-[13px] text-muted"
                      initial={reduced ? false : { opacity: 0, y: -3 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {note || item.detail}
                    </motion.p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>

        <p className="mt-7 text-[13px] text-muted">
          You can leave this page — the clip downloads on its own when it is done.
        </p>
      </div>
    </div>
  );
}
