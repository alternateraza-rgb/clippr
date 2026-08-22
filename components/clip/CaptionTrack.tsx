"use client";

import { cn } from "@/lib/cn";
import { groupExit, isKeyword, wordMotion } from "@/lib/captions/motion";
import type { CaptionLine, CaptionPreset } from "@/lib/agent/types";

export function CaptionTrack({
  lines,
  time,
  preset,
}: {
  lines: CaptionLine[];
  time: number;
  preset: CaptionPreset;
}) {
  const line =
    lines.find((l) => time >= l.start && time < l.end) ??
    lines.find((l) => time >= l.start - 0.04 && time < l.end + 0.09);
  if (!line || line.words.length === 0) return null;

  const exit = groupExit(time, line.end);
  const goldIndex = line.words.findIndex((w) => isKeyword(w));

  return (
    <p
      className={cn(
        "pointer-events-none absolute inset-x-3 z-20 flex items-center justify-center gap-1.5 text-center leading-none",
        "bottom-[14%] flex-nowrap overflow-visible font-caption font-normal uppercase tracking-[-0.04em]",
        preset === "hormozi" && "text-[clamp(22px,6.4vw,34px)]",
        preset === "clean" && "text-[clamp(20px,5.8vw,30px)]",
        preset === "karaoke" && "text-[clamp(20px,5.8vw,30px)]",
      )}
      style={{
        opacity: exit.opacity,
        transform: `scale(${exit.scale})`,
        textShadow:
          preset === "hormozi"
            ? undefined
            : "0 2px 0 #0c0a09, 0 0 12px rgba(0,0,0,0.55), -2px -2px 0 #0c0a09, 2px 2px 0 #0c0a09",
      }}
    >
      {line.words.map((word, i) => {
        const localMs = (time - word.start) * 1000;
        const motion = wordMotion(localMs, word, i, {
          preset,
          stayGold: preset === "hormozi" && i === goldIndex && time >= word.start,
        });
        if (!motion.visible && localMs < 0) {
          return (
            <span
              key={`${word.start}-${i}`}
              className="inline-block w-0 overflow-hidden opacity-0"
              aria-hidden
            />
          );
        }
        const display = preset === "hormozi" ? word.text.toUpperCase() : word.text;
        return (
          <span
            key={`${word.start}-${i}`}
            className={cn(
              "inline-block origin-bottom will-change-transform",
              preset === "hormozi" && "rounded-[10px] px-[0.42em] py-[0.18em]",
              preset !== "hormozi" && "px-[0.08em]",
            )}
            style={{
              opacity: motion.opacity,
              color: motion.text,
              backgroundColor: preset === "hormozi" ? motion.fill === "#F5E27A" ? "#F5E27A" : "#0c0a09" : "transparent",
              boxShadow:
                preset === "hormozi"
                  ? motion.glow
                    ? `0 4px 0 #0c0a09, 0 0 ${motion.glow}px rgba(245,226,122,0.55)`
                    : "0 4px 0 #0c0a09"
                  : undefined,
              transform: `translateY(${motion.y}%) scale(${motion.scaleX}, ${motion.scaleY}) rotate(${motion.rotate}deg)`,
            }}
          >
            {display}
          </span>
        );
      })}
    </p>
  );
}
