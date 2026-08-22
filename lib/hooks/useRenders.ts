"use client";

import { useEffect, useState } from "react";
import type { ClipRender } from "@/lib/agent/types";

export function useRenders() {
  const [renders, setRenders] = useState<ClipRender[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      fetch("/api/studio/renders")
        .then((r) => r.json())
        .then((data: { renders?: ClipRender[] }) => {
          if (!cancelled) setRenders(data.renders ?? []);
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

  return { renders, loading, reload: () => undefined };
}
