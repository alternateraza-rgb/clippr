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
  loadVideoById?: (opts: { videoId: string; startSeconds: number; endSeconds: number }) => void;
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
      PlayerState?: { UNSTARTED: number; ENDED: number; PLAYING: number; PAUSED: number; CUED: number };
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

function jumpToClip(player: YtPlayer, videoId: string, start: number, duration: number, withAudio: boolean) {
  if (withAudio) {
    player.unMute?.();
    player.setVolume?.(100);
  }
  const end = Math.max(start + 1, start + duration);
  if (player.loadVideoById) {
    player.loadVideoById({ videoId, startSeconds: start, endSeconds: end });
  } else {
    player.seekTo(start, true);
    player.playVideo();
  }
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
  const startRef = useRef(start);
  const durationRef = useRef(duration);
  const seeks = useRef(0);
  const [playing, setPlaying] = useState(autoPlay);
  const [time, setTime] = useState(0);
  const [synced, setSynced] = useState(false);
  const split = gameplay !== "none";
  const withAudio = !autoPlay;
  startRef.current = start;
  durationRef.current = duration;

  useEffect(() => {
    if (!playing || !mount.current) return;
    let cancelled = false;
    let raf = 0;
    const host = mount.current;
    const el = document.createElement("div");
    el.className = "h-full w-full";
    host.appendChild(el);
    loadApi().then(() => {
      if (cancelled || !window.YT?.Player) return;
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      player.current = new window.YT.Player(el, {
        videoId,
        playerVars: {
          start: Math.max(0, Math.floor(startRef.current)),
          end: Math.max(1, Math.ceil(startRef.current + durationRef.current)),
          autoplay: 1,
          mute: withAudio ? 0 : 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
          ...(origin.startsWith("http") ? { origin } : {}),
        },
        events: {
          onReady: (e) => {
            seeks.current = 0;
            jumpToClip(e.target, videoId, startRef.current, durationRef.current, withAudio);
          },
          onStateChange: (e) => {
            const targetStart = startRef.current;
            const span = durationRef.current;
            const now = e.target.getCurrentTime?.() ?? 0;
            const playingState = window.YT?.PlayerState?.PLAYING;
            const endedState = window.YT?.PlayerState?.ENDED;
            const cuedState = window.YT?.PlayerState?.CUED;
            if (e.data === endedState) {
              jumpToClip(e.target, videoId, targetStart, span, withAudio);
              return;
            }
            if ((e.data === playingState || e.data === cuedState) && withAudio) {
              e.target.unMute?.();
              e.target.setVolume?.(100);
            }
            if (e.data === playingState && now < targetStart - 1 && seeks.current < 6) {
              seeks.current += 1;
              e.target.seekTo(targetStart, true);
            }
          },
        },
      });
      const tick = () => {
        const target = startRef.current;
        const span = Math.max(durationRef.current, 0.1);
        const current = player.current?.getCurrentTime?.() ?? target;
        const rel = current - target;
        if (rel < -1.1) {
          setSynced(false);
          if (seeks.current < 6) {
            seeks.current += 1;
            player.current?.seekTo(target, true);
          }
          setTime(0);
        } else {
          setSynced(true);
          setTime(Math.max(0, Math.min(span, rel)));
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
  }, [playing, videoId, withAudio]);

  useEffect(() => {
    if (!playing || !player.current) return;
    seeks.current = 0;
    setSynced(false);
    setTime(0);
    jumpToClip(player.current, videoId, start, duration, withAudio);
  }, [start, duration, playing, videoId, withAudio]);

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
      <CaptionTrack
        lines={!playing || synced ? captionLines : []}
        time={playing ? time : 0}
        preset={preset}
        animate={playing && synced}
      />
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
