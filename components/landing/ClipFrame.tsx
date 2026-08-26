"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { usePrefersReducedMotion } from "@/components/motion/usePrefersReducedMotion";
import type { ShowcaseClip } from "@/lib/fixtures/showcase";
import { cn } from "@/lib/cn";

/**
 * Poster first, always. The image is the component; the video is layered over
 * it once it can actually play, so a slow or failed fetch degrades to a still
 * frame rather than a black rectangle. Nothing is fetched until the frame is
 * near the viewport.
 */
export function ClipFrame({
  clip,
  autoplay = false,
  className,
  priority = false,
}: {
  clip: ShowcaseClip;
  autoplay?: boolean;
  className?: string;
  priority?: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  const host = useRef<HTMLDivElement | null>(null);
  const video = useRef<HTMLVideoElement | null>(null);
  const [near, setNear] = useState(priority);
  const [playable, setPlayable] = useState(false);

  useEffect(() => {
    if (near || !host.current) return;
    const el = host.current;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  const wants = near && autoplay && !reduced;

  useEffect(() => {
    const el = video.current;
    if (!el || !wants) return;
    void el.play().catch(() => setPlayable(false));
  }, [wants]);

  function hover(on: boolean) {
    const el = video.current;
    if (!el || reduced || autoplay) return;
    if (on) void el.play().catch(() => null);
    else el.pause();
  }

  return (
    <div
      ref={host}
      onMouseEnter={() => hover(true)}
      onMouseLeave={() => hover(false)}
      className={cn(
        "group relative isolate aspect-[9/16] overflow-hidden rounded-[18px] bg-void",
        "shadow-[0_0_0_1px_rgb(0_0_0/0.08),0_18px_44px_rgb(0_0_0/0.18)]",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={clip.poster}
        alt=""
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {near ? (
        <video
          ref={video}
          src={clip.src}
          poster={clip.poster}
          muted
          loop
          playsInline
          preload="metadata"
          onCanPlay={() => setPlayable(true)}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
            playable ? "opacity-100" : "opacity-0",
          )}
        />
      ) : null}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/30" />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-3">
        <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10.5px] font-medium uppercase tracking-[0.08em] text-white backdrop-blur-sm">
          {clip.label}
        </span>
        <span className="tnum rounded-full bg-white/15 px-2.5 py-1 text-[10.5px] font-medium text-white backdrop-blur-sm">
          {clip.views}
        </span>
      </div>

      {/* No caption overlay: these clips already carry the burned-in captions
          Clipmuse wrote for them. Adding our own on top would double them up. */}

      {!autoplay ? (
        <span className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1.5 text-[10.5px] font-medium text-white backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-0">
          <Play className="h-3 w-3" fill="currentColor" strokeWidth={0} />
          Hover to play
        </span>
      ) : null}
    </div>
  );
}
