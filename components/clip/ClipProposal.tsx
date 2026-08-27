"use client";

import { motion } from "framer-motion";
import { Clock, RefreshCw, Scissors, Sparkles } from "lucide-react";
import { Pill } from "@/components/ui/Pill";
import { ScoreBar, ScoreRing } from "@/components/ui/ScoreRing";
import { Tag } from "@/components/ui/Chip";
import { usePrefersReducedMotion } from "@/components/motion/usePrefersReducedMotion";
import { base, fast } from "@/components/motion/presets";
import { formatTimestamp } from "@/lib/format";
import { thumbnailFor } from "@/lib/youtube";
import type { ClipCandidate } from "@/lib/agent/types";

const ROLE_LABEL: Record<string, string> = {
  setup: "Setup",
  beat: "Beat",
  turn: "The turn",
  payoff: "Payoff",
};

/**
 * The cut Clipmuse wants to make, before it spends minutes making it.
 *
 * Rendering is the expensive half of this product, so the decision belongs in
 * front of it rather than after: the reader sees the topic, the span, the
 * reasoning and the beats, then either approves it or sends the model back for
 * something else.
 */
export function ClipProposal({
  candidate,
  videoId,
  attempt,
  onApprove,
  onReject,
  rescanning,
}: {
  candidate: ClipCandidate;
  videoId: string;
  /** 1 for the first idea, 2 for the first rescan, and so on. */
  attempt: number;
  onApprove: () => void;
  onReject: () => void;
  rescanning: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  const length = Math.round(candidate.end - candidate.start);
  const segments = candidate.segments ?? [];

  return (
    <motion.div
      key={candidate.id}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? fast : base}
      className="overflow-hidden rounded-panel bg-surface shadow-hairline"
    >
      <div className="relative aspect-[16/7] overflow-hidden bg-void">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnailFor(videoId)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/50 to-void/20" />

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
          <div className="min-w-0">
            <Tag tone="dark">
              <Sparkles className="h-3 w-3" strokeWidth={2.2} />
              {attempt === 1 ? "Clipmuse picked this" : `Idea ${attempt}`}
            </Tag>
            <p className="tnum mt-2.5 flex items-center gap-1.5 text-caption text-white/70">
              <Clock className="h-3.5 w-3.5" strokeWidth={2} />
              {formatTimestamp(candidate.start)} – {formatTimestamp(candidate.end)}
              <span className="text-white/40">·</span>
              {length}s
            </p>
          </div>
          <ScoreRing score={candidate.score} size={50} onDark className="shrink-0" />
        </div>
      </div>

      <div className="p-6">
        {candidate.topic ? (
          <h2 className="display text-d2 text-ink">{candidate.topic}</h2>
        ) : null}

        {candidate.hook ? (
          <p className="mt-2.5 text-md text-ink">
            &ldquo;{candidate.hook}&rdquo;
          </p>
        ) : null}

        {candidate.whyItClips ? (
          <p className="mt-3 text-base text-body">{candidate.whyItClips}</p>
        ) : null}

        {segments.length > 1 ? (
          <div className="mt-6">
            <h3 className="eyebrow text-ink">
              Built from {segments.length} moments
            </h3>
            <ol className="mt-3 space-y-1.5">
              {segments.map((segment, i) => (
                <li
                  key={`${segment.start}-${i}`}
                  className="flex items-start gap-3 rounded-control bg-surface-warm px-3.5 py-2.5"
                >
                  <span className="tnum mt-px shrink-0 text-micro font-semibold text-brand">
                    {formatTimestamp(segment.start)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-caption font-medium uppercase tracking-[0.06em] text-muted">
                      {ROLE_LABEL[segment.role] ?? segment.role}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-body">
                      {segment.quote}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        <div className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <ScoreBar label="Hook" value={candidate.scores.hook} />
          <ScoreBar label="Emotion" value={candidate.scores.emotion} />
          <ScoreBar label="Stands alone" value={candidate.scores.selfContained} />
          <ScoreBar label="Quotability" value={candidate.scores.quotability} />
          <ScoreBar label="Payoff" value={candidate.scores.payoff} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-hairline p-5">
        <Pill
          onClick={onApprove}
          disabled={rescanning}
          className="flex-1 sm:flex-initial"
          icon={<Scissors className="h-4 w-4" strokeWidth={2} />}
        >
          Make this clip
        </Pill>
        <Pill
          variant="outline"
          onClick={onReject}
          loading={rescanning}
          icon={<RefreshCw className="h-4 w-4" strokeWidth={2} />}
        >
          Find another idea
        </Pill>
      </div>
    </motion.div>
  );
}
