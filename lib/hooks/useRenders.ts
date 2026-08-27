"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ClipRender } from "@/lib/agent/types";

/** Statuses that are still going somewhere. Anything else has settled. */
const IN_FLIGHT: ClipRender["status"][] = [
  "queued",
  "downloading",
  "transcribing",
  "scoring",
  "rendering",
];

const POLL_MS = 4000;

export function useRenders(options?: { withUrls?: boolean }) {
  const withUrls = options?.withUrls !== false;
  const [renders, setRenders] = useState<ClipRender[]>([]);
  const [loading, setLoading] = useState(true);
  /**
   * Ids the server has already confirmed deleted. The poll below can still be
   * holding a response from before the delete landed, so without this the card
   * pops back into the grid for one four-second beat.
   */
  const dropped = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = () => {
      fetch(withUrls ? "/api/studio/renders" : "/api/studio/renders?meta=1")
        .then((r) => r.json())
        .then((data: { renders?: ClipRender[] }) => {
          if (cancelled) return;
          const next = (data.renders ?? []).filter((r) => !dropped.current.has(r.id));
          setRenders(next);
          // Keep watching only while something is actually being made. A
          // library of finished clips was re-fetching itself every four
          // seconds for as long as the tab stayed open.
          if (next.some((r) => IN_FLIGHT.includes(r.status))) {
            timer = setTimeout(tick, POLL_MS);
          }
        })
        .catch(() => null)
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [withUrls]);

  const remove = useCallback((id: string) => {
    dropped.current.add(id);
    setRenders((current) => current.filter((r) => r.id !== id));
  }, []);

  return { renders, loading, remove };
}
