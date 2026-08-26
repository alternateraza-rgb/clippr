"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ClipRender } from "@/lib/agent/types";

export function useRenders() {
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
    const tick = () => {
      fetch("/api/studio/renders")
        .then((r) => r.json())
        .then((data: { renders?: ClipRender[] }) => {
          if (cancelled) return;
          setRenders((data.renders ?? []).filter((r) => !dropped.current.has(r.id)));
        })
        .catch(() => null)
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };
    tick();
    const timer = setInterval(tick, 4000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const remove = useCallback((id: string) => {
    dropped.current.add(id);
    setRenders((current) => current.filter((r) => r.id !== id));
  }, []);

  return { renders, loading, remove };
}
