"use client";

import { useEffect, useState } from "react";
import type { IdeaPreview } from "@/lib/agent/idea-preview";
import type { DiscoveryItem } from "@/lib/agent/types";

/** Survives unmounts, so reopening a sheet you already read is instant. */
const cache = new Map<string, IdeaPreview>();
const inFlight = new Set<string>();

/**
 * The AI take on one idea. The cache is read during render rather than copied
 * into state, so there is exactly one source of truth and no effect that has to
 * sync one into the other.
 */
export function useIdeaPreview(item: DiscoveryItem | null) {
  const id = item?.video.videoId ?? null;
  const [, bumpVersion] = useState(0);

  const preview = id ? (cache.get(id) ?? null) : null;
  const loading = Boolean(item) && !preview;

  useEffect(() => {
    if (!item || !id || cache.has(id) || inFlight.has(id)) return;
    inFlight.add(id);
    let cancelled = false;

    fetch("/api/ideas/preview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        videoId: id,
        title: item.video.title,
        channel: item.video.channel,
        durationS: item.video.durationS,
        description: item.video.description,
        niche: item.niche,
        hook: item.hook,
        whyItClips: item.whyItClips,
        score: item.score,
      }),
    })
      .then((r) => r.json())
      .then((d: { preview?: IdeaPreview }) => {
        if (d.preview) cache.set(id, d.preview);
      })
      .catch(() => {
        // Offline or blocked: cache something honest so the panel resolves
        // instead of spinning forever.
        cache.set(id, {
          source: "heuristic",
          angle: item.whyItClips || "Couldn't reach the model just now.",
          audience: "",
          moments: [],
          hooks: item.hook ? [item.hook] : [],
          scores: {
            hook: item.score,
            emotion: item.score,
            selfContained: item.score,
            quotability: item.score,
            payoff: item.score,
          },
          watchOut: "This read is offline — reopen the idea once you're connected.",
        });
      })
      .finally(() => {
        inFlight.delete(id);
        if (!cancelled) bumpVersion((v) => v + 1);
      });

    return () => {
      cancelled = true;
    };
  }, [id, item]);

  return { preview, loading };
}
