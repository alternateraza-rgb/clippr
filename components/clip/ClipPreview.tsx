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
  unMute?: () => void;
  setVolume?: (n: number) => void;
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

function armPlayer(player: YtPlayer, start: number, withAudio: boolean) {
  if (withAudio) {
    player.unMute?.();
    player.setVolume?.(100);
  }
  player.seekTo(start, true);
  player.playVideo();
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
  const withAudio = !autoPlay;

  useEffect(() => {
    if (!playing || !mount.current) return;
    let cancelled = false;
    let raf = 0;
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
          autoplay: 1,
          mute: withAudio ? 0 : 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onReady: (e) => armPlayer(e.target, start, withAudio),
          onStateChange: (e) => {
            if (e.data === window.YT?.PlayerState?.ENDED) {
              armPlayer(e.target, start, withAudio);
            }
            if (e.data === window.YT?.PlayerState?.PLAYING && withAudio) {
              e.target.unMute?.();
              e.target.setVolume?.(100);
            }
          },
        },
      });
      const tick = () => {
        const current = player.current?.getCurrentTime?.() ?? start;
        const span = Math.max(duration, 0.1);
        const rel = current - start;
        if (rel < -0.15) {
          setTime(0);
        } else if (rel >= span) {
          setTime(span);
        } else {
          setTime(Math.max(0, rel));
        }
        raf = window.requestAnimationFrame(tick);
      };
      raf = window.requestAnimationFrame(tick);
    });
    return () => {
      cancelled = true;
      if (raf) window.cancelAnimationFrame(raf);
      player.current?.destroy();
      player.current = null;
      el.remove();
    };
  }, [playing, videoId, start, duration, withAudio]);

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
          className="absolute inset-x-0 top-0 bottom-[22%] z-30 flex items-center justify-center bg-ink/25"
        >
          <span className="rounded-full bg-on-brand/95 px-5 py-2 text-[13px] text-ink shadow-hairline">
            Play preview
          </span>
        </button>
      ) : null}
    </div>
  );
}
