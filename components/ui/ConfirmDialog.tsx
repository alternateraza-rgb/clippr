"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pill } from "@/components/ui/Pill";
import { usePrefersReducedMotion } from "@/components/motion/usePrefersReducedMotion";

/**
 * The stop-and-think step before something irreversible. Says what will happen
 * in the title, what can't be undone in the body, and names the action on the
 * button — "Delete", never "OK", so the mouse is never the only thing that
 * knows what it is agreeing to.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  working = false,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  working?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  const panel = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      // Escape cancels, but only while nothing is in flight — backing out
      // mid-delete would leave the user unsure whether it happened.
      if (e.key === "Escape" && !working) onCancel();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, working, onCancel]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.1 : 0.18 }}
        >
          <button
            type="button"
            aria-label={cancelLabel}
            onClick={() => !working && onCancel()}
            className="absolute inset-0 cursor-default bg-black/45 backdrop-blur-[2px]"
          />

          <motion.div
            ref={panel}
            tabIndex={-1}
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            className="relative w-full max-w-[400px] rounded-[var(--radius-panel)] bg-canvas p-6 shadow-pop outline-none"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 }}
            transition={
              reduced
                ? { duration: 0.1 }
                : { type: "spring", stiffness: 420, damping: 34, mass: 0.8 }
            }
          >
            <h2 className="display text-[20px] text-ink">{title}</h2>
            <div className="mt-2.5 text-[14.5px] leading-relaxed text-body">{body}</div>

            {error ? <p className="mt-3 text-[13.5px] text-brand">{error}</p> : null}

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <Pill variant="ghost" onClick={onCancel} disabled={working}>
                {cancelLabel}
              </Pill>
              <Pill onClick={onConfirm} loading={working}>
                {confirmLabel}
              </Pill>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
