"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Check,
  Copy,
  Scissors,
  Sparkles,
  X,
} from "lucide-react";
import { Pill } from "@/components/ui/Pill";
import { ScoreBar, ScoreRing } from "@/components/ui/ScoreRing";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tag } from "@/components/ui/Chip";
import { usePrefersReducedMotion } from "@/components/motion/usePrefersReducedMotion";
import { useIdeaPreview } from "@/lib/hooks/useIdeaPreview";
import { formatDuration, formatTimestamp } from "@/lib/format";
import type { DiscoveryItem } from "@/lib/agent/types";
import { cn } from "@/lib/cn";

export function IdeaSheet({
  item,
  onClose,
}: {
  item: DiscoveryItem | null;
  onClose: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  const { preview, loading } = useIdeaPreview(item);
  const panel = useRef<HTMLDivElement | null>(null);

  // Escape closes, and the page behind stops scrolling while the sheet is up.
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [item, onClose]);

  return (
    <AnimatePresence>
      {item ? (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.12 : 0.2 }}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-black/45 backdrop-blur-[2px]"
          />

          <motion.div
            ref={panel}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={item.video.title}
            className={cn(
              "relative flex h-full w-full flex-col bg-canvas outline-none",
              "sm:w-[min(560px,100%)] sm:rounded-l-[var(--radius-panel)] sm:shadow-pop",
            )}
            initial={reduced ? { opacity: 0 } : { x: "100%" }}
            animate={reduced ? { opacity: 1 } : { x: 0 }}
            exit={reduced ? { opacity: 0 } : { x: "100%" }}
            transition={
              reduced
                ? { duration: 0.12 }
                : { type: "spring", stiffness: 320, damping: 36, mass: 0.9 }
            }
          >
            <SheetBody item={item} preview={preview} loading={loading} onClose={onClose} />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function SheetBody({
  item,
  preview,
  loading,
  onClose,
}: {
  item: DiscoveryItem;
  preview: ReturnType<typeof useIdeaPreview>["preview"];
  loading: boolean;
  onClose: () => void;
}) {
  const watchUrl = `https://www.youtube.com/watch?v=${item.video.videoId}`;

  return (
    <>
      <div className="relative shrink-0">
        <div className="relative aspect-video overflow-hidden bg-void sm:rounded-tl-[var(--radius-panel)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.video.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-void via-void/25 to-void/10" />

          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-medium text-white/70">
                {item.video.channel}
              </p>
              <p className="tnum mt-1 text-[12px] text-white/55">
                {formatDuration(item.video.durationS)} · {item.estimatedClipCount} cuts
              </p>
            </div>
            <ScoreRing score={item.score} size={52} onDark className="shrink-0" />
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
        >
          <X className="h-4 w-4" strokeWidth={2.2} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <h2 className="display text-[22px] leading-snug text-ink">{item.video.title}</h2>

        {loading && !preview ? <PreviewSkeleton /> : null}

        {preview ? (
          <div className="mt-7 space-y-8">
            <Block
              title="The angle"
              badge={
                <Tag tone={preview.source === "llm" ? "brand" : "neutral"}>
                  <Sparkles className="h-3 w-3" strokeWidth={2.2} />
                  {preview.source === "llm" ? "AI read" : "From metadata"}
                </Tag>
              }
            >
              <p className="text-[15px] leading-relaxed text-body">{preview.angle}</p>
              <p className="mt-3 text-[14px] leading-relaxed text-muted">{preview.audience}</p>
            </Block>

            <Block title="Where to cut">
              <ol className="-mx-2">
                {preview.moments.map((moment) => (
                  <li key={`${moment.at}-${moment.label}`}>
                    <a
                      href={`${watchUrl}&t=${moment.at}s`}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex gap-3.5 rounded-[var(--radius-control)] px-2 py-2.5 transition-colors hover:bg-surface-warm"
                    >
                      <span className="tnum mt-px shrink-0 rounded-[6px] bg-ink px-2 py-1 text-[11.5px] font-semibold text-on-brand">
                        {formatTimestamp(moment.at)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-[14.5px] font-medium text-ink">
                          {moment.label}
                          <ArrowUpRight
                            className="h-3.5 w-3.5 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100"
                            strokeWidth={2}
                          />
                        </span>
                        <span className="mt-1 block text-[13.5px] leading-relaxed text-muted">
                          {moment.why}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
            </Block>

            <Block title="Hooks to open with">
              <div className="space-y-2">
                {preview.hooks.map((hook) => (
                  <HookRow key={hook} hook={hook} />
                ))}
              </div>
            </Block>

            <Block title="How it scores">
              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <ScoreBar label="Hook" value={preview.scores.hook} />
                <ScoreBar label="Emotion" value={preview.scores.emotion} />
                <ScoreBar label="Stands alone" value={preview.scores.selfContained} />
                <ScoreBar label="Quotability" value={preview.scores.quotability} />
                <ScoreBar label="Payoff" value={preview.scores.payoff} />
              </div>
            </Block>

            <p className="rounded-[var(--radius-control)] bg-surface-warm px-4 py-3 text-[13px] leading-relaxed text-muted">
              {preview.watchOut}
            </p>
          </div>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-hairline bg-canvas px-6 py-4">
        <div className="flex items-center gap-3">
          <Pill
            href={`/app/studio?v=${item.video.videoId}`}
            className="flex-1"
            icon={<Scissors className="h-4 w-4" strokeWidth={2} />}
          >
            Clip it
          </Pill>
          <Pill href={watchUrl} variant="outline">
            Watch
          </Pill>
        </div>
      </div>
    </>
  );
}

function Block({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h3 className="eyebrow text-ink">{title}</h3>
        {badge}
      </div>
      <div className="mt-3.5">{children}</div>
    </section>
  );
}

function HookRow({ hook }: { hook: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(hook);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be blocked; the text is on screen either way.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="group flex w-full items-center gap-3 rounded-[var(--radius-control)] bg-surface px-4 py-3 text-left shadow-hairline transition-colors hover:bg-surface-warm"
    >
      <span className="min-w-0 flex-1 text-[14.5px] leading-snug text-ink">{hook}</span>
      <span className="shrink-0 text-muted transition-colors group-hover:text-ink">
        {copied ? (
          <Check className="h-4 w-4 text-success" strokeWidth={2.2} />
        ) : (
          <Copy className="h-4 w-4" strokeWidth={2} />
        )}
      </span>
      <span className="sr-only">{copied ? "Copied" : "Copy hook"}</span>
    </button>
  );
}

/** Shaped like the answer, so the panel doesn't jump when it arrives. */
function PreviewSkeleton() {
  return (
    <div className="mt-7 space-y-8">
      <div>
        <Skeleton className="h-3 w-20 rounded-full" />
        <div className="mt-4 space-y-2">
          <Skeleton className="h-3.5 w-full rounded-full" />
          <Skeleton className="h-3.5 w-[92%] rounded-full" />
          <Skeleton className="h-3.5 w-[64%] rounded-full" />
        </div>
      </div>
      <div>
        <Skeleton className="h-3 w-24 rounded-full" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex gap-3.5">
              <Skeleton className="h-6 w-12 rounded-[6px]" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-[45%] rounded-full" />
                <Skeleton className="h-3 w-[88%] rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="flex items-center gap-2 text-[13px] text-muted">
        <Sparkles className="h-3.5 w-3.5 animate-pulse text-brand" strokeWidth={2.2} />
        Reading the video for an angle…
      </p>
    </div>
  );
}
