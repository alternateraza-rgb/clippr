"use client";

import { useCallback, useEffect, useState } from "react";
import type { DiscoveryItem, Niche } from "@/lib/agent/types";
import { IDEAS, ideasForNiche } from "@/lib/fixtures/ideas";

export function useDiscovery(niche: Niche, mode: "niche" | "all" | "high" = "niche") {
  const fallback =
    mode === "all" ? IDEAS : mode === "high" ? IDEAS.filter((i) => i.score >= 80) : ideasForNiche(niche);
  const [items, setItems] = useState<DiscoveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    const url =
      mode === "all" || mode === "high"
        ? "/api/discovery/feed"
        : `/api/discovery/feed?niche=${encodeURIComponent(niche)}`;
    let cancelled = false;
    fetch(url)
      .then((r) => r.json())
      .then((d: { items?: DiscoveryItem[]; live?: boolean }) => {
        if (cancelled) return;
        const isLive = Boolean(d.live);
        setLive(isLive);
        const next = mode === "high" ? (d.items ?? []).filter((i) => i.score >= 80) : (d.items ?? []);
        setItems(next.length ? next : isLive ? [] : fallback);
      })
      .catch(() => {
        if (!cancelled) setItems(fallback);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // fallback is derived each render; depend on niche/mode/tick only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [niche, mode, tick]);

  return { items, loading, live, refresh };
}
