"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CaptionTrack } from "@/components/clip/CaptionTrack";
import { GameplayPane } from "@/components/clip/GameplayPane";
import { cn } from "@/lib/cn";
import { createPlaybackClock } from "@/lib/captions/clock";
import type { CaptionLine, CaptionPreset, GameplayTrack } from "@/lib/agent/types";

type ClipPreviewProps = {
  videoId: string;
  start: number;
  duration: number;
  captionLines: CaptionLine[];
  preset: CaptionPreset;
  gameplay: GameplayTrack;
  autoPlay?: boolean;
  fallbackText?: string;
  className?: string;
};

function embedSrc(videoId: string, start: number, duration: number, playing: boolean, origin: string) {
  const from = Math.max(0, Math.floor(start));
  const to = Math.max(from + 1, Math.ceil(start + Math.max(duration, 1)));
  const params = new URLSearchParams({
    start: String(from),
    end: String(to),
    autoplay: playing ? "1" : "0",
    mute: playing ? "0" : "1",
    controls: "0",
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
    fs: "0",
    enablejsapi: "1",
  });
  if (origin) {
    params.set("origin", origin);
    params.set("widget_referrer", origin);
  }
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

function ytCommand(frame: HTMLIFrameElement, func: string, args: unknown[] = []) {
  frame.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");
}

function ytListen(frame: HTMLIFrameElement) {
  frame.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: "clip-preview" }), "*");
}

export function ClipPreview({
  videoId,
  start,
  duration,
  captionLines,
  preset,
  gameplay,
  autoPlay = false,
  fallbackText = "",
  className,
}: ClipPreviewProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const clockRef = useRef(createPlaybackClock());
  const [playing, setPlaying] = useState(autoPlay);
  const [time, setTime] = useState(0);
  const split = gameplay !== "none";
  const span = Math.max(duration, 0.1);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const src = useMemo(
    () => embedSrc(videoId, start, span, playing, origin),
    [videoId, start, span, playing, origin],
  );

  useEffect(() => {
    setPlaying(autoPlay);
  }, [videoId, start, autoPlay]);

  // Anchor the caption clock to the iframe's real playback position instead
  // of assuming autoplay started the instant we requested it.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (typeof event.data !== "string" || !/youtube/.test(event.origin)) return;
      let payload: { event?: string; info?: { currentTime?: number } };
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }
      if (payload.event !== "infoDelivery") return;
      const currentTime = payload.info?.currentTime;
      if (typeof currentTime !== "number") return;
      clockRef.current.sync(Math.max(0, currentTime - start));
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [start]);

  useEffect(() => {
    clockRef.current.reset();
    let raf = 0;
    const tick = () => {
      setTime(playing ? clockRef.current.elapsed() : 0);
      if (playing) raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [playing, videoId, start]);

  function handleFrameLoad() {
    if (frameRef.current) ytListen(frameRef.current);
  }

  function handlePlay() {
    const url = embedSrc(videoId, start, span, true, origin);
    const frame = frameRef.current;
    if (frame) {
      // Assign inside the click so autoplay+audio counts as a user gesture.
      frame.src = url;
      window.setTimeout(() => {
        if (!frameRef.current) return;
        ytListen(frameRef.current);
        ytCommand(frameRef.current, "unMute");
        ytCommand(frameRef.current, "playVideo");
      }, 200);
    }
    setPlaying(true);
  }

  return (
    <div
      className={cn("relative flex flex-col overflow-hidden rounded-[24px] bg-ink shadow-lift", className)}
      style={{ aspectRatio: "9 / 16" }}
    >
      <div className={cn("relative min-h-0 overflow-hidden bg-ink", split ? "h-[42%]" : "h-[74%]")}>
        <iframe
          ref={frameRef}
          key={`${videoId}-${Math.floor(start)}`}
          title="Clip preview"
          src={src}
          onLoad={handleFrameLoad}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen={false}
          className="pointer-events-none absolute left-1/2 top-1/2 h-[120%] w-[185%] -translate-x-1/2 -translate-y-1/2 border-0"
        />
        {!playing ? (
          <button
            type="button"
            onClick={handlePlay}
            className="absolute inset-0 z-10 flex items-center justify-center bg-ink/25"
          >
            <span className="rounded-full bg-on-brand/95 px-5 py-2 text-[13px] text-ink shadow-hairline">
              Play preview
            </span>
          </button>
        ) : null}
      </div>
      {split ? (
        <div className="h-[32%] min-h-0">
          <GameplayPane track={gameplay} />
        </div>
      ) : null}
      <div className="flex h-[26%] min-h-[96px] items-center justify-center bg-ink px-3 py-3">
        <CaptionTrack
          lines={captionLines}
          preset={preset}
          playing={playing}
          time={time}
          duration={span}
          fallback={fallbackText}
        />
      </div>
    </div>
  );
}
