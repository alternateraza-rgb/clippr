"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, X } from "lucide-react";
import { usePrefersReducedMotion } from "@/components/motion/usePrefersReducedMotion";
import { base } from "@/components/motion/presets";
import { Pill } from "@/components/ui/Pill";
import { clipFilename, downloadBlobUrl } from "@/lib/download";
import type { ClipRender } from "@/lib/agent/types";

export function ClipLightbox({
  render,
  onClose,
}: {
  render: (ClipRender & { posterUrl?: string | null }) | null;
  onClose: () => void;
}) {
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (!render) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // The page behind must not scroll while a modal owns the screen.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [render, onClose]);

  return (
    <AnimatePresence>
      {render ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={base}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-ink/70 backdrop-blur-md" />

          <motion.div
            className="relative flex max-h-full flex-col items-center gap-4"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            transition={base}
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src={render.downloadUrl ?? undefined}
              poster={render.posterUrl ?? undefined}
              controls
              autoPlay
              loop
              playsInline
              className="max-h-[70vh] rounded-[var(--radius-panel)] bg-black shadow-pop"
            />

            <div className="flex w-full max-w-[46ch] flex-col items-center gap-3 text-center">
              {render.topic ? (
                <p className="display text-[19px] leading-snug text-on-brand">{render.topic}</p>
              ) : render.hook ? (
                <p className="text-[15px] leading-snug text-on-brand">{render.hook}</p>
              ) : null}
              {render.why ? (
                <p className="text-[13.5px] leading-relaxed text-on-brand/70">{render.why}</p>
              ) : null}
              <Pill
                variant="ghost"
                onClick={() => {
                  if (render.downloadUrl) {
                    void downloadBlobUrl(
                      render.downloadUrl,
                      clipFilename(render.videoId, render.id),
                    );
                  }
                }}
              >
                <Download className="h-4 w-4" strokeWidth={1.9} />
                Download
              </Pill>
            </div>
          </motion.div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-canvas/10 text-on-brand backdrop-blur-sm transition-colors hover:bg-canvas/20 md:right-8 md:top-8"
          >
            <X className="h-5 w-5" strokeWidth={1.9} />
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
