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
        "pointer-events-none absolute inset-x-3 z-20 text-center leading-[1.15]",
        preset === "hormozi" &&
          "top-[38%] font-sans text-[17px] font-semibold uppercase tracking-wide text-white",
        preset === "clean" &&
          "top-[40%] font-sans text-[16px] font-medium text-white",
        preset === "karaoke" &&
          "top-[40%] font-sans text-[17px] font-semibold text-white",
      )}
      style={
        preset === "hormozi"
          ? { WebkitTextStroke: "3px #0c0a09", paintOrder: "stroke fill" }
          : { textShadow: "0 2px 10px rgba(0,0,0,0.55)" }
      }
    >
      {line.words.map((word, i) => {
        const active = time >= word.start && time < word.end;
        const passed = time >= word.end;
        return (
          <span
            key={`${word.start}-${i}`}
            className={cn(
              "inline-block px-[2px] transition-transform duration-100",
              preset === "hormozi" && active && "scale-110 text-[#f5e27a]",
              preset === "clean" && active && "opacity-100",
              preset === "clean" && !active && "opacity-80",
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
