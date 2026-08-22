"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";

type ClipLoopProps = {
  sources: string[];
  seconds?: number;
  className?: string;
};

export function ClipLoop({ sources, seconds = 5, className }: ClipLoopProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (sources.length <= 1) return;
    const timer = setTimeout(() => {
      setIndex((i) => (i + 1) % sources.length);
    }, seconds * 1000);
    return () => clearTimeout(timer);
  }, [index, seconds, sources.length]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[24px] bg-ink shadow-lift",
        className,
      )}
      style={{ aspectRatio: "9 / 16" }}
    >
      <div className="absolute inset-x-3 top-3 z-20 flex gap-1.5">
        {sources.map((src, i) => (
          <div
            key={src}
            className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25"
          >
            {i < index ? (
              <div className="h-full w-full bg-white" />
            ) : i === index ? (
              <motion.div
                key={`${src}-${index}`}
                className="h-full bg-white"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: seconds, ease: "linear" }}
              />
            ) : null}
          </div>
        ))}
      </div>

      <AnimatePresence initial={false}>
        <motion.video
          key={sources[index]}
          className="absolute inset-0 h-full w-full object-cover"
          src={sources[index]}
          autoPlay
          muted
          playsInline
          initial={{ opacity: 0, scale: 1.08, filter: "blur(6px)" }}
          animate={{
            opacity: 1,
            scale: 1,
            filter: "blur(0px)",
            transition: { duration: 0.7, ease: [0.2, 0.8, 0.2, 1] },
          }}
          exit={{
            opacity: 0,
            scale: 0.96,
            filter: "blur(6px)",
            transition: { duration: 0.5, ease: [0.2, 0.8, 0.2, 1] },
          }}
        />
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />
    </div>
  );
}
