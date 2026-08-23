"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Film, RotateCw, X } from "lucide-react";
import { ClipCard } from "@/components/app/ClipCard";
import { ClipLightbox } from "@/components/app/ClipLightbox";
import { PageHeader } from "@/components/app/PageHeader";
import { Pill } from "@/components/ui/Pill";
import { Skeleton } from "@/components/ui/Skeleton";
import { stagger } from "@/components/motion/presets";
import { useRenders } from "@/lib/hooks/useRenders";
import type { ClipRender } from "@/lib/agent/types";

type Clip = ClipRender & { posterUrl?: string | null };

export default function LibraryPage() {
  const { renders, loading } = useRenders();
  const [open, setOpen] = useState<Clip | null>(null);
  const [dismissed, setDismissed] = useState(false);

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
            <p className="tnum text-[13px] text-muted">
              {clips.length} clip{clips.length === 1 ? "" : "s"}
            </p>
          ) : null
        }
      />

      {working.length ? (
        <div className="mt-8 flex items-center gap-3 rounded-[var(--radius-card,16px)] bg-surface px-5 py-4 shadow-hairline">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
          </span>
          <p className="text-[14px] text-ink">
            {working.length} clip{working.length === 1 ? "" : "s"} still rendering
          </p>
          <p className="text-[13px] text-muted">They appear here on their own.</p>
        </div>
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
          {clips.map((render, i) => (
            <ClipCard key={render.id} render={render} index={i} onOpen={() => setOpen(render)} />
          ))}
        </motion.div>
      ) : !loading ? (
        <EmptyState />
      ) : null}

      {/* Failures are quiet, not silent: one line, dismissible. A clip that
          died with no trace at all just looks like the app lost it. */}
      {failed.length && !dismissed ? (
        <div className="mt-10 flex items-center gap-3 rounded-[var(--radius-control,10px)] bg-surface-warm px-4 py-3">
          <p className="flex-1 text-[13px] text-body">
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

      <ClipLightbox render={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-12 flex flex-col items-center rounded-[var(--radius-panel,22px)] bg-surface px-6 py-16 text-center shadow-hairline">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-warm">
        <Film className="h-6 w-6 text-brand" strokeWidth={1.5} />
      </span>
      <p className="display mt-5 text-[20px] text-ink">Nothing cut yet</p>
      <p className="mt-2 max-w-[34ch] text-[14px] text-body">
        Paste a longform video in Studio and the first clip lands here in a
        couple of minutes.
      </p>
      <Pill className="mt-6" href="/app/studio">
        Open Studio
      </Pill>
    </div>
  );
}
