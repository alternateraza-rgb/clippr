"use client";

import { useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { IdeaCard } from "@/components/app/IdeaCard";
import { IdeaSheet } from "@/components/app/IdeaSheet";
import { PageHeader } from "@/components/app/PageHeader";
import { Chip } from "@/components/ui/Chip";
import { Pill } from "@/components/ui/Pill";
import { Skeleton } from "@/components/ui/Skeleton";
import { nicheById } from "@/lib/fixtures/niches";
import { useDiscovery } from "@/lib/hooks/useDiscovery";
import { useProfile } from "@/lib/store/profile";
import type { DiscoveryItem } from "@/lib/agent/types";

const FILTERS = [
  { id: "niche", label: "Your niche" },
  { id: "high", label: "Score 80+" },
  { id: "all", label: "All desks" },
] as const;

export default function IdeasPage() {
  const { profile } = useProfile();
  const niche = nicheById(profile.niche);
  const [filter, setFilter] = useState<"niche" | "all" | "high">("niche");
  const { items, loading, live, refresh } = useDiscovery(profile.niche, filter);
  const [stocking, setStocking] = useState(false);
  const [open, setOpen] = useState<DiscoveryItem | null>(null);

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

  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" });

  return (
    <div className="pb-4">
      <PageHeader
        eyebrow={`Today's cuts · ${today}`}
        title={`Ideas for ${niche.label.toLowerCase()}`}
        lede="Longform with clipping potential in your niche. Open one to see the angle, where to cut, and the hooks to open with."
        action={
          <Pill
            onClick={restock}
            variant="outline"
            size="sm"
            loading={stocking}
            icon={<RefreshCw className="h-4 w-4" strokeWidth={2} />}
          >
            Refresh feed
          </Pill>
        }
      />

      <div className="mt-8 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Chip key={f.id} selected={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
          </Chip>
        ))}
        {!loading && items.length ? (
          <p className="tnum ml-auto text-[13px] text-muted">
            {items.length} video{items.length === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="aspect-[16/11]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-10 rounded-[var(--radius-card)] bg-surface p-10 text-center shadow-hairline">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft">
            <Sparkles className="h-5 w-5 text-brand" strokeWidth={2} />
          </span>
          <p className="mx-auto mt-4 max-w-[44ch] text-[15px] leading-relaxed text-body">
            {live
              ? "Quiet day in this niche — or the feed hasn't been built yet. A thin day is a real day; we don't invent volume."
              : "Quiet day. Come back tomorrow, or paste your own link from Home."}
          </p>
          <div className="mt-5">
            <Pill
              onClick={restock}
              loading={stocking}
              icon={<RefreshCw className="h-4 w-4" strokeWidth={2} />}
            >
              {stocking ? "Researching…" : "Research this niche"}
            </Pill>
          </div>
        </div>
      ) : (
        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <IdeaCard key={item.id} item={item} onOpen={() => setOpen(item)} />
          ))}
        </div>
      )}

      <IdeaSheet item={open} onClose={() => setOpen(null)} />
    </div>
  );
}
