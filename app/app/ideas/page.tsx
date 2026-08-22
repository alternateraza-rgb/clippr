"use client";

import { useState } from "react";
import { VideoCard } from "@/components/app/VideoCard";
import { Chip } from "@/components/ui/Chip";
import { nicheById } from "@/lib/fixtures/niches";
import { useDiscovery } from "@/lib/hooks/useDiscovery";
import { useProfile } from "@/lib/store/profile";

export default function IdeasPage() {
  const { profile } = useProfile();
  const niche = nicheById(profile.niche);
  const [filter, setFilter] = useState<"niche" | "all" | "high">("niche");
  const items = useDiscovery(profile.niche, filter);

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      <p className="text-[13px] font-medium text-muted">Today&apos;s cuts · {today}</p>
      <h1 className="display mt-2 text-[28px] text-ink">
        Ideas for {niche.label.toLowerCase()}
      </h1>
      <p className="mt-2 max-w-[48ch] text-body">
        Longform with clipping potential in your niche. A thin day is a real
        day — we don&apos;t invent volume.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
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

      {items.length === 0 ? (
        <p className="mt-16 text-body">Quiet day. Come back tomorrow, or paste your own link.</p>
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
