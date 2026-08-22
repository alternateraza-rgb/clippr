"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import {
  clipElapsed,
  fallbackCaptionLine,
  normalizeCaptionLines,
  stickyCaptionLine,
} from "@/lib/captions/clock";
import { GOLD, INK, WHITE, isKeyword } from "@/lib/captions/motion";
import type { CaptionLine, CaptionPreset } from "@/lib/agent/types";

export function CaptionTrack({
  lines,
  preset,
  playing = false,
  clipStart = 0,
  duration = 12,
  fallback = "",
}: {
  lines: CaptionLine[];
  preset: CaptionPreset;
  playing?: boolean;
  clipStart?: number;
  duration?: number;
  fallback?: string;
}) {
  const [time, setTime] = useState(0);
  const prepared = useMemo(() => {
    const normalized = normalizeCaptionLines(lines, duration);
    if (normalized.length) return normalized;
    if (fallback.trim()) return [fallbackCaptionLine(fallback, duration)];
    return [];
  }, [lines, duration, fallback]);

  useEffect(() => {
    setTime(0);
    if (!playing) return;
    const origin = performance.now();
    const tick = () => setTime(clipElapsed(origin, clipStart));
    tick();
    const id = window.setInterval(tick, 80);
    return () => window.clearInterval(id);
  }, [playing, clipStart, duration]);

  const line = stickyCaptionLine(prepared, time);
  if (!line) return <p className="sr-only">No captions for this window</p>;

  return (
    <p
      className={cn(
        "flex w-full flex-wrap items-center justify-center gap-x-[0.35em] gap-y-[0.28em] text-center leading-none",
        "font-caption font-normal uppercase tracking-[-0.04em]",
        preset === "hormozi" && "text-[clamp(18px,5.4vw,28px)]",
        preset !== "hormozi" && "text-[clamp(16px,5vw,24px)]",
      )}
      style={
        preset === "hormozi"
          ? undefined
          : { textShadow: "0 2px 0 #0c0a09, 0 0 12px rgba(0,0,0,0.55), -2px -2px 0 #0c0a09, 2px 2px 0 #0c0a09" }
      }
    >
      {line.words.map((word, i) => {
        const active = playing && time >= word.start && time < Math.max(word.end, word.start + 0.16);
        const keyword = isKeyword(word);
        const gold = preset === "hormozi" && (active || (keyword && time >= word.start));
        const display = preset === "hormozi" ? word.text.toUpperCase() : word.text;
        return (
          <span
            key={`${line.start}-${i}-${word.text}`}
            className={cn(
              "inline-block max-w-full origin-bottom break-words",
              preset === "hormozi" && "rounded-[10px] px-[0.42em] py-[0.18em]",
              preset !== "hormozi" && "px-[0.08em]",
            )}
            style={{
              opacity: 1,
              color: preset === "hormozi" ? (gold ? INK : WHITE) : WHITE,
              backgroundColor: preset === "hormozi" ? (gold ? GOLD : "#0c0a09") : "transparent",
              boxShadow:
                preset === "hormozi"
                  ? gold
                    ? "0 4px 0 #0c0a09, 0 0 16px rgba(245,226,122,0.5)"
                    : "0 4px 0 #0c0a09"
                  : undefined,
              transform: active ? "scale(1.08)" : "scale(1)",
              transition: "transform 120ms ease, background-color 120ms, color 120ms, box-shadow 120ms",
            }}
          >
            {display}
          </span>
        );
      })}
    </p>
  );
}
