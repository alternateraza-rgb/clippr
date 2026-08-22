"use client";

import { useEffect, useState } from "react";
import type { DiscoveryItem, Niche } from "@/lib/agent/types";
import { IDEAS, ideasForNiche } from "@/lib/fixtures/ideas";

export function useDiscovery(niche: Niche, mode: "niche" | "all" | "high" = "niche") {
  const fallback =
    mode === "all" ? IDEAS : mode === "high" ? IDEAS.filter((i) => i.score >= 80) : ideasForNiche(niche);
  const [items, setItems] = useState<DiscoveryItem[]>(fallback);

  useEffect(() => {
    const url =
      mode === "all" || mode === "high"
        ? "/api/discovery/feed"
        : `/api/discovery/feed?niche=${encodeURIComponent(niche)}`;
    fetch(url)
      .then((r) => r.json())
      .then((d: { items?: DiscoveryItem[] }) => {
        if (!d.items?.length) {
          setItems(fallback);
          return;
        }
        const next = mode === "high" ? d.items.filter((i) => i.score >= 80) : d.items;
        setItems(next.length ? next : fallback);
      })
      .catch(() => setItems(fallback));
    // fallback is derived each render; depend on niche/mode only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [niche, mode]);

  return items;
}
