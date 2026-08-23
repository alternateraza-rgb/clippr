"use client";

import { useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { VideoCard } from "@/components/app/VideoCard";
import { Chip } from "@/components/ui/Chip";
import { Pill } from "@/components/ui/Pill";
import { Skeleton } from "@/components/ui/Skeleton";
import { nicheById } from "@/lib/fixtures/niches";
import { useDiscovery } from "@/lib/hooks/useDiscovery";
import { useProfile } from "@/lib/store/profile";

export default function IdeasPage() {
  const { profile } = useProfile();
  const niche = nicheById(profile.niche);
  const [filter, setFilter] = useState<"niche" | "all" | "high">("niche");
  const { items, loading, live, refresh } = useDiscovery(profile.niche, filter);
  const [stocking, setStocking] = useState(false);

  async function restock() {
    setStocking(true);
    try {
      await fetch("/api/discovery/bootstrap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          niche: profile.niche,
          interests: profile.interests,
          platforms: profile.platforms,
        }),
      });
      refresh();
    } finally {
      setStocking(false);
    }
  }

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      <PageHeader
        eyebrow={`Today's cuts · ${today}`}
        title={`Ideas for ${niche.label.toLowerCase()}`}
        lede="Longform with clipping potential in your niche. A thin day is a real day — we don't invent volume."
      />

      <div className="mt-8 flex flex-wrap gap-2">
        <Chip selected={filter === "niche"} onClick={() => setFilter("niche")}>
          Your niche
        </Chip>
        <Chip selected={filter === "high"} onClick={() => setFilter("high")}>
          Score 80+
        </Chip>
        <Chip selected={filter === "all"} onClick={() => setFilter("all")}>
          All desks
        </Chip>
      </div>

      {loading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[16/11] rounded-[12px]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-16">
          <p className="text-body">
            {live
              ? "Quiet day in this niche — or the feed hasn’t been built yet."
              : "Quiet day. Come back tomorrow, or paste your own link."}
          </p>
          <div className="mt-6">
            <Pill onClick={restock} disabled={stocking}>
              {stocking ? "Researching…" : "Research this niche"}
            </Pill>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <VideoCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
