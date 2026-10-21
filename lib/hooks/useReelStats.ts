"use client";

import { useEffect, useState } from "react";
import type { StatsPayload } from "@/lib/stats/types";

const EMPTY: StatsPayload = { reels: [], videos: {}, posters: {}, unsorted: 0 };

/** Batches the sorter will run before giving up for this visit. */
const MAX_SORT_ROUNDS = 6;

/**
 * The reels behind both Stats pages.
 *
 * When some reels predate genres, this sorts them while the page is open and
 * re-reads once it's done — the page draws straight away and the genre charts
 * catch up, rather than the whole page waiting on a model call.
 */
export function useReelStats() {
  const [data, setData] = useState<StatsPayload>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const read = () =>
      fetch("/api/stats")
        .then((r) => r.json() as Promise<StatsPayload>)
        .catch(() => EMPTY);

    (async () => {
      const first = await read();
      if (cancelled) return;
      setData(first);
      setLoading(false);
      if (!first.unsorted) return;

      setSorting(true);
      let changed = false;
      for (let round = 0; round < MAX_SORT_ROUNDS; round++) {
        const res = await fetch("/api/stats/sort", { method: "POST" })
          .then((r) => r.json() as Promise<{ sorted?: number }>)
          .catch(() => ({ sorted: 0 }));
        if (cancelled) return;
        // Nothing sorted means the model is down or nothing is left. Either
        // way, asking again this visit won't help.
        if (!res.sorted) break;
        changed = true;
      }
      if (changed) {
        const next = await read();
        if (!cancelled) setData(next);
      }
      if (!cancelled) setSorting(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, sorting };
}
