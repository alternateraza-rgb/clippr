"use client";

import { useEffect, useRef, useState } from "react";
import { CaptionTrack } from "@/components/clip/CaptionTrack";
import { GameplayPane } from "@/components/clip/GameplayPane";
import { cn } from "@/lib/cn";
import type { CaptionLine, CaptionPreset, GameplayTrack } from "@/lib/agent/types";

type ClipPreviewProps = {
  videoId: string;
  start: number;
  duration: number;
  captionLines: CaptionLine[];
  preset: CaptionPreset;
  gameplay: GameplayTrack;
  autoPlay?: boolean;
  className?: string;
};

type YtPlayer = {
  getCurrentTime: () => number;
  getPlayerState: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  destroy: () => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (e: { target: YtPlayer }) => void;
            onStateChange?: (e: { data: number; target: YtPlayer }) => void;
          };
        },
      ) => YtPlayer;
      PlayerState?: { ENDED: number; PLAYING: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

function loadApi() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    }
    const tick = window.setInterval(() => {
      if (window.YT?.Player) {
        window.clearInterval(tick);
        resolve();
      }
    }, 40);
  });
}

export function ClipPreview({
  videoId,
  start,
  duration,
  captionLines,
  preset,
  gameplay,
  autoPlay = false,
  className,
}: ClipPreviewProps) {
  const mount = useRef<HTMLDivElement>(null);
  const player = useRef<YtPlayer | null>(null);
  const [playing, setPlaying] = useState(autoPlay);
  const [time, setTime] = useState(0);
  const split = gameplay !== "none";

  useEffect(() => {
    if (!playing || !mount.current) return;
    let cancelled = false;
    let interval: number | undefined;
    const host = mount.current;
    if (!host) return;
    const el = document.createElement("div");
    el.className = "h-full w-full";
    host.appendChild(el);
    loadApi().then(() => {
      if (cancelled || !window.YT?.Player) return;
      player.current = new window.YT.Player(el, {
        videoId,
        playerVars: {
          start: Math.floor(start),
          end: Math.ceil(start + duration),
          autoplay: 1,
          mute: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onReady: (e) => e.target.playVideo(),
          onStateChange: (e) => {
            if (e.data === window.YT?.PlayerState?.ENDED) {
              e.target.seekTo(start, true);
              e.target.playVideo();
            }
          },
        },
      });
      interval = window.setInterval(() => {
        const current = player.current?.getCurrentTime?.() ?? start;
        const rel = Math.max(0, current - start);
        setTime(rel % Math.max(duration, 0.1));
      }, 80);
    });
    return () => {
      cancelled = true;
      if (interval) window.clearInterval(interval);
      player.current?.destroy();
      player.current = null;
      el.remove();
    };
  }, [playing, videoId, start, duration]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[24px] bg-ink shadow-lift",
        className,
      )}
      style={{ aspectRatio: "9 / 16" }}
    >
      <div className={cn("absolute inset-x-0 top-0 overflow-hidden", split ? "h-[54%]" : "h-full")}>
        <div className="h-full w-full scale-[1.35] origin-center">
          <div ref={mount} className="h-full w-full" />
        </div>
      </div>
      {split ? (
        <div className="absolute inset-x-0 bottom-0 h-[46%]">
          <GameplayPane track={gameplay} />
        </div>
      ) : null}
      <CaptionTrack lines={captionLines} time={time} preset={preset} />
      {!playing ? (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="absolute inset-0 z-30 flex items-center justify-center bg-ink/25"
        >
          <span className="rounded-full bg-on-brand/95 px-5 py-2 text-[13px] text-ink shadow-hairline">
            Play preview
          </span>
        </button>
      ) : null}
    </div>
  );
}
