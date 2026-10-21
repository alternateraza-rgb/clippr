"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, RefreshCw, Sparkles } from "lucide-react";
import { IdeaCard } from "@/components/app/IdeaCard";
import { IdeaSheet } from "@/components/app/IdeaSheet";
import { UrlPaste } from "@/components/app/UrlPaste";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pill } from "@/components/ui/Pill";
import { Skeleton } from "@/components/ui/Skeleton";
import { nicheById } from "@/lib/fixtures/niches";
import { greetingForNow } from "@/lib/format";
import { useDiscovery } from "@/lib/hooks/useDiscovery";
import { useJobs } from "@/lib/store/jobs";
import { useProfile } from "@/lib/store/profile";
import { isYouTubeUrl } from "@/lib/youtube";
import type { DiscoveryItem } from "@/lib/agent/types";

export default function HomePage() {
  const { profile } = useProfile();
  const { jobs } = useJobs();
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const niche = nicheById(profile.niche);
  const { items: ideas, loading, live, refresh } = useDiscovery(profile.niche);
  const [stocking, setStocking] = useState(false);
  const [open, setOpen] = useState<DiscoveryItem | null>(null);

  const viral = ideas.slice(0, 6);

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

  function go() {
    if (!isYouTubeUrl(url)) {
      setError("Paste a YouTube link — watch, share, or shorts.");
      return;
    }
    setError("");
    router.push(`/app/studio?url=${encodeURIComponent(url.trim())}`);
  }

  return (
    <div className="pb-4">
      <p className="eyebrow text-brand">{niche.label}</p>
      <h1 className="display mt-2.5 text-d4 text-ink">
        {greetingForNow(profile.displayName)}
      </h1>

      {/* The one thing this page is for. */}
      <UrlPaste
        className="mt-7"
        value={url}
        onChange={(next) => {
          setUrl(next);
          setError("");
        }}
        onSubmit={go}
        placeholder="https://youtube.com/watch?v=…"
        error={error}
        hint="Works best on 8 minutes or more — podcasts, interviews, streams, sermons."
      >
        <h2 className="display text-d1 text-white md:text-d2">
          Paste a long video. Get one clip worth posting.
        </h2>
        <p className="mt-2 max-w-[52ch] text-base text-white/60">
          Clipmuse listens to the whole thing, picks the strongest minute, and
          edits it — captions burned in, framed vertical, ready to upload.
        </p>
      </UrlPaste>

      {jobs.length ? (
        <section className="mt-10">
          <h2 className="eyebrow text-ink">Picking up where you left off</h2>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
            {jobs.slice(0, 6).map((job) => (
              <Link
                key={job.id}
                href={`/app/studio?v=${job.video.videoId}&clip=${job.candidate.id}`}
                className="min-w-[240px] rounded-card bg-surface p-4 shadow-hairline transition-shadow duration-[var(--dur-base)] hover:shadow-hairline-strong"
              >
                <p className="text-micro font-semibold uppercase tracking-[0.08em] text-brand">
                  {job.status}
                </p>
                <p className="mt-2 line-clamp-2 text-base font-medium text-ink">
                  {job.candidate.hook}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="eyebrow text-ink">Worth cutting today</h2>
            <p className="mt-2 text-md text-body">
              Longform in {niche.label.toLowerCase()} that hasn&apos;t been clipped yet.
            </p>
          </div>
          <Pill
            href="/app/ideas"
            variant="text"
            size="sm"
            icon={<ArrowRight className="h-4 w-4 order-2" strokeWidth={2} />}
          >
            All ideas
          </Pill>
        </div>

        {loading ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="aspect-[16/11]" />
            ))}
          </div>
        ) : viral.length === 0 ? (
          <EmptyFeed live={live} stocking={stocking} onRestock={restock} />
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {viral.map((item) => (
              <IdeaCard key={item.id} item={item} onOpen={() => setOpen(item)} />
            ))}
          </div>
        )}
      </section>

      <IdeaSheet item={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function EmptyFeed({
  live,
  stocking,
  onRestock,
}: {
  live: boolean;
  stocking: boolean;
  onRestock: () => void;
}) {
  return (
    <EmptyState
      className="mt-5"
      icon={Sparkles}
      body={
        live
          ? "Nothing in the feed for this niche yet. Send Clipmuse out to find some."
          : "No ideas queued up right now. Paste a link above to cut one yourself."
      }
      action={
        <Pill
          onClick={onRestock}
          loading={stocking}
          icon={<RefreshCw className="h-4 w-4" strokeWidth={2} />}
        >
          {stocking ? "Researching…" : "Find videos"}
        </Pill>
      }
    />
  );
}
