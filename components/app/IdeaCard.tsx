"use client";

import { Clapperboard, Play } from "lucide-react";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { formatDuration, formatRelativeDate } from "@/lib/format";
import type { DiscoveryItem } from "@/lib/agent/types";
import { cn } from "@/lib/cn";

/**
 * A button, not a link: the card opens the preview sheet in place. Going
 * straight to the studio was the old behaviour and it skipped the part where
 * you decide whether the video is worth spending a render on.
 */
export function IdeaCard({
  item,
  onOpen,
  className,
}: {
  item: DiscoveryItem;
  onOpen: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group flex w-full flex-col overflow-hidden rounded-card bg-surface text-left",
        "shadow-hairline transition-shadow duration-[var(--dur-base)] ease-[var(--ease-out-soft)]",
        "hover:shadow-hairline-strong",
        className,
      )}
    >
      <div className="relative aspect-video overflow-hidden bg-surface-warm-alt">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.video.thumbnailUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-[var(--dur-slow)] ease-[var(--ease-out-soft)] group-hover:scale-[1.03]"
        />
        <span className="tnum absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-0.5 text-micro font-medium text-white backdrop-blur-sm">
          {formatDuration(item.video.durationS)}
        </span>

        {/* The affordance has to say "look inside", not "play" — clicking opens
            the read on the video, it does not start the video. */}
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-[var(--dur-base)] group-hover:bg-black/35 group-hover:opacity-100">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink">
            <Play className="h-3.5 w-3.5" fill="currentColor" strokeWidth={0} />
            See the angle
          </span>
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 truncate text-caption font-medium text-muted">
            {item.video.channel} · {formatRelativeDate(item.video.publishedAt)}
          </p>
          <ScoreRing score={item.score} size={38} />
        </div>

        <h3 className="display mt-2.5 line-clamp-2 text-lg text-ink">
          {item.video.title}
        </h3>

        <p className="mt-2.5 line-clamp-2 flex-1 text-sm text-body">
          {item.whyItClips}
        </p>

        <p className="mt-4 flex items-center gap-1.5 border-t border-hairline pt-3.5 text-caption text-muted">
          <Clapperboard className="h-3.5 w-3.5" strokeWidth={2} />
          {item.estimatedClipCount} cut{item.estimatedClipCount === 1 ? "" : "s"} in this one
        </p>
      </div>
    </button>
  );
}
