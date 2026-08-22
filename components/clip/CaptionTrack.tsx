"use client";

import { cn } from "@/lib/cn";
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
  const line = lines.find((l) => time >= l.start && time < l.end);
  if (!line || line.words.length === 0) return null;

  return (
    <p
      className={cn(
        "pointer-events-none absolute inset-x-3 z-20 flex flex-wrap items-center justify-center gap-1.5 text-center leading-[1.15]",
        preset === "hormozi" && "top-[36%] font-sans text-[16px] font-semibold uppercase tracking-wide",
        preset === "clean" && "top-[40%] font-sans text-[16px] font-medium text-white",
        preset === "karaoke" && "top-[40%] font-sans text-[17px] font-semibold text-white",
      )}
      style={
        preset === "hormozi"
          ? undefined
          : { textShadow: "0 2px 10px rgba(0,0,0,0.55)" }
      }
    >
      {line.words.map((word, i) => {
        const active = time >= word.start && time < word.end;
        const passed = time >= word.end;
        const popped = time >= word.start;
        return (
          <span
            key={`${word.start}-${i}`}
            className={cn(
              "inline-block origin-bottom transition-transform duration-150",
              preset === "hormozi" &&
                "rounded-[8px] bg-ink px-2 py-1 text-white shadow-[0_2px_0_#0c0a09]",
              preset === "hormozi" && popped && "scale-100",
              preset === "hormozi" && !popped && "scale-50 opacity-0",
              preset === "hormozi" && active && "scale-110 bg-[#f5e27a] text-ink",
              preset === "clean" && "px-[2px]",
              preset === "clean" && active && "opacity-100",
              preset === "clean" && !active && "opacity-80",
              preset === "karaoke" && "px-[2px]",
              preset === "karaoke" && (active || passed) && "text-brand-tint",
              preset === "karaoke" && active && "scale-110",
            )}
          >
            {word.text}
          </span>
        );
      })}
    </p>
  );
}
