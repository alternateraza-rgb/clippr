"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Download, Play, Trash2 } from "lucide-react";
import { usePrefersReducedMotion } from "@/components/motion/usePrefersReducedMotion";
import { base, riseIn, riseInStill } from "@/components/motion/presets";
import { clipFilename, downloadBlobUrl } from "@/lib/download";
import { formatRelativeDate } from "@/lib/format";
import type { ClipRender } from "@/lib/agent/types";
import { cn } from "@/lib/cn";

function seconds(value?: number | null) {
  if (!value || value < 1) return null;
  const m = Math.floor(value / 60);
  const s = Math.round(value % 60);
  return m ? `${m}:${String(s).padStart(2, "0")}` : `0:${String(s).padStart(2, "0")}`;
}

export function ClipCard({
  render,
  onOpen,
  onDelete,
  index = 0,
}: {
  render: ClipRender & { posterUrl?: string | null };
  onOpen: () => void;
  onDelete?: () => void;
  index?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const video = useRef<HTMLVideoElement | null>(null);
  const [hovering, setHovering] = useState(false);
  const [saving, setSaving] = useState(false);
  const length = seconds(render.durationS);

  function preview(on: boolean) {
    setHovering(on);
    const el = video.current;
    if (!el || reduced) return;
    if (on) {
      // Muted playback only starts on intent, so a grid of clips does not pull
      // every file the moment the page loads.
      el.currentTime = 0;
      void el.play().catch(() => null);
    } else {
      el.pause();
    }
  }

  async function save(event: React.MouseEvent) {
    event.stopPropagation();
    if (!render.downloadUrl || saving) return;
    setSaving(true);
    try {
      await downloadBlobUrl(render.downloadUrl, clipFilename(render.videoId, render.id));
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.article
      layout
      variants={reduced ? riseInStill : riseIn}
      custom={index}
      exit={
        reduced
          ? { opacity: 0 }
          : { opacity: 0, scale: 0.9, filter: "blur(4px)", transition: base }
      }
      onMouseEnter={() => preview(true)}
      onMouseLeave={() => preview(false)}
      onClick={onOpen}
      transition={base}
      className="group cursor-pointer"
    >
      <motion.div
        layoutId={`clip-${render.id}`}
        style={{ borderRadius: "var(--radius-card)" }}
        className={cn(
          "relative aspect-[9/16] overflow-hidden bg-ink",
          "shadow-hairline transition-shadow duration-[var(--dur-base)] group-hover:shadow-hairline-strong",
        )}
      >
        <video
          ref={video}
          // #t=1 gives a real frame as the poster without a separate image when
          // the worker has not written one.
          src={render.posterUrl ? render.downloadUrl ?? undefined : `${render.downloadUrl}#t=1`}
          poster={render.posterUrl ?? undefined}
          muted
          loop
          playsInline
          preload="metadata"
          className={cn(
            "h-full w-full object-cover",
            "transition-transform duration-[var(--dur-slow)] ease-[var(--ease-out-soft)]",
            "group-hover:scale-[1.04]",
          )}
        />

        <div
          className={cn(
            "pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/5 to-transparent",
            "opacity-90 transition-opacity duration-[var(--dur-base)] group-hover:opacity-100",
          )}
        />

        {!hovering ? (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-canvas/85 shadow-lift backdrop-blur-sm transition-transform duration-[var(--dur-base)] group-hover:scale-110">
              <Play className="ml-0.5 h-5 w-5 text-ink" strokeWidth={2} fill="currentColor" />
            </span>
          </span>
        ) : null}

        {length ? (
          <span className="tnum absolute right-2.5 top-2.5 rounded-full bg-ink/70 px-2 py-0.5 text-micro text-on-brand backdrop-blur-sm">
            {length}
          </span>
        ) : null}

        <div
          className={cn(
            "absolute left-2.5 top-2.5 flex items-center gap-1.5",
            "opacity-0 transition-opacity duration-[var(--dur-base)] group-hover:opacity-100",
            "focus-within:opacity-100",
            saving && "opacity-100",
          )}
        >
          <button
            type="button"
            onClick={save}
            aria-label="Download clip"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-canvas/85 text-ink shadow-hairline backdrop-blur-sm transition-transform hover:scale-105"
          >
            <Download className={cn("h-4 w-4", saving && "animate-pulse")} strokeWidth={1.9} />
          </button>

          {onDelete ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
              aria-label="Delete clip"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-canvas/85 text-ink shadow-hairline backdrop-blur-sm transition-[transform,background-color,color] hover:scale-105 hover:bg-brand hover:text-on-brand"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.9} />
            </button>
          ) : null}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-3.5">
          <p className="line-clamp-2 text-sm font-medium text-on-brand">
            {render.topic || render.hook || "Untitled clip"}
          </p>
        </div>
      </motion.div>

      <p className="mt-2.5 px-0.5 text-caption text-muted">
        {formatRelativeDate(render.createdAt)}
        {render.segmentCount && render.segmentCount > 1
          ? ` · ${render.segmentCount} moments`
          : ""}
      </p>
    </motion.article>
  );
}
