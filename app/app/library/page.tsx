"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Film, RotateCw, X } from "lucide-react";
import { ClipCard } from "@/components/app/ClipCard";
import { BeforeYouPost } from "@/components/app/BeforeYouPost";
import { ClipLightbox } from "@/components/app/ClipLightbox";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Pill } from "@/components/ui/Pill";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { stagger } from "@/components/motion/presets";
import { useRenders } from "@/lib/hooks/useRenders";
import type { ClipRender } from "@/lib/agent/types";

type Clip = ClipRender & { posterUrl?: string | null };

export default function LibraryPage() {
  const { renders, loading, remove } = useRenders();
  const [open, setOpen] = useState<Clip | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Clip | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/studio/renders/${pendingDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      // Only now: the card animating out is a promise that the file is gone.
      remove(pendingDelete.id);
      setPendingDelete(null);
    } catch {
      setDeleteError("That clip could not be deleted. Try again in a moment.");
    } finally {
      setDeleting(false);
    }
  }

  const { clips, working, failed } = useMemo(() => {
    const list = renders as Clip[];
    return {
      clips: list.filter((r) => r.status === "ready" && r.downloadUrl),
      working: list.filter((r) => r.status !== "ready" && r.status !== "failed"),
      // Failures stay out of the grid entirely — they were the clutter.
      failed: list.filter((r) => r.status === "failed"),
    };
  }, [renders]);

  return (
    <div>
      <PageHeader
        eyebrow="Library"
        title="Clips you already cut"
        lede="Every finished clip lands here and downloads itself. Hover to preview, click to watch."
        action={
          clips.length ? (
            <p className="tnum text-sm text-muted">
              {clips.length} clip{clips.length === 1 ? "" : "s"}
            </p>
          ) : null
        }
      />

      {working.length ? (
        <Card padding="none" className="mt-8 flex items-center gap-3 px-5 py-4">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
          </span>
          <p className="text-base text-ink">
            {working.length} clip{working.length === 1 ? "" : "s"} still rendering
          </p>
          <p className="text-sm text-muted">They appear here on their own.</p>
        </Card>
      ) : null}

      {loading && !clips.length ? (
        <div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[9/16]" />
          ))}
        </div>
      ) : clips.length ? (
        <motion.div
          variants={stagger()}
          initial="hidden"
          animate="show"
          className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4"
        >
          {/* popLayout so the surviving cards slide into the gap instead of
              snapping once the deleted one has finished leaving. */}
          <AnimatePresence mode="popLayout">
            {clips.map((render, i) => (
              <ClipCard
                key={render.id}
                render={render}
                index={i}
                onOpen={() => setOpen(render)}
                onDelete={() => {
                  setDeleteError("");
                  setPendingDelete(render);
                }}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : !loading ? (
        <LibraryEmpty />
      ) : null}

      {/* Failures are quiet, not silent: one line, dismissible. A clip that
          died with no trace at all just looks like the app lost it. */}
      {failed.length && !dismissed ? (
        <div className="mt-10 flex items-center gap-3 rounded-control bg-surface-warm px-4 py-3">
          <p className="flex-1 text-sm text-body">
            {failed.length} clip{failed.length === 1 ? "" : "s"} didn&apos;t finish.
          </p>
          <Pill variant="text" href="/app/studio">
            <RotateCw className="h-3.5 w-3.5" strokeWidth={2} />
            Try again
          </Pill>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="text-muted transition-colors hover:text-ink"
          >
            <X className="h-4 w-4" strokeWidth={1.9} />
          </button>
        </div>
      ) : null}

      {/* Only once you have something to post — posting advice above an empty
          library is just noise. */}
      {clips.length ? <BeforeYouPost className="mt-14 max-w-[640px]" /> : null}

      <ClipLightbox render={open} onClose={() => setOpen(null)} />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this clip?"
        body={
          <>
            This removes{" "}
            <span className="text-ink">
              {pendingDelete?.topic || pendingDelete?.hook || "this clip"}
            </span>{" "}
            and the video file behind it. If you haven&apos;t downloaded it, it&apos;s
            gone for good.
          </>
        }
        confirmLabel="Delete clip"
        working={deleting}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => {
          setPendingDelete(null);
          setDeleteError("");
        }}
      />
    </div>
  );
}

function LibraryEmpty() {
  return (
    <EmptyState
      className="mt-12"
      icon={Film}
      title="Nothing cut yet"
      body="Paste a longform video in Studio and the first clip lands here in a couple of minutes."
      action={<Pill href="/app/studio">Open Studio</Pill>}
    />
  );
}
