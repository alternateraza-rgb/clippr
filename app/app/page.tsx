"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { VideoCard } from "@/components/app/VideoCard";
import { PageHeader } from "@/components/app/PageHeader";
import { Field } from "@/components/ui/Field";
import { Pill } from "@/components/ui/Pill";
import { Skeleton } from "@/components/ui/Skeleton";
import { nicheById } from "@/lib/fixtures/niches";
import { greetingForNow } from "@/lib/format";
import { useDiscovery } from "@/lib/hooks/useDiscovery";
import { useJobs } from "@/lib/store/jobs";
import { useProfile } from "@/lib/store/profile";
import { isYouTubeUrl } from "@/lib/youtube";

export default function HomePage() {
  const { profile } = useProfile();
  const { jobs } = useJobs();
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const niche = nicheById(profile.niche);
  const { items: ideas, loading, live, refresh } = useDiscovery(profile.niche);
  const [stocking, setStocking] = useState(false);
  const viral = ideas.slice(0, 6);
  const teaser = ideas.slice(0, 3);

  async function restock() {
    setStocking(true);
    try {
      await fetch("/api/discovery/bootstrap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ niche: profile.niche, interests: profile.interests, platforms: profile.platforms }),
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
    <div>
      <PageHeader
        eyebrow={niche.label}
        title={greetingForNow(profile.displayName)}
        lede="Paste a longform video, or take one of today's cuts. The agent already knows your niche."
      />

      <div className="mt-9 max-w-[640px]">
        <Field
          value={url}
          onChange={(v) => {
            setUrl(v);
            setError("");
          }}
          onSubmit={go}
          submitLabel="Clip it"
          placeholder="Paste a YouTube link"
        />
        {error ? <p className="mt-3 text-[13px] text-brand">{error}</p> : null}
      </div>

      <section className="mt-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-muted">Potentially viral</p>
            <h2 className="display mt-2 text-[21px] text-ink">
              Longform that fits {niche.label.toLowerCase()}
            </h2>
          </div>
        </div>
        {loading ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[16/11]" />
            ))}
          </div>
        ) : viral.length === 0 ? (
          <div className="mt-5 rounded-[var(--radius-card,16px)] bg-surface p-6 shadow-hairline">
            <p className="text-body">
              {live
                ? "No longform in the feed yet. We’ll search YouTube for this niche."
                : "Add YOUTUBE_API_KEY to research real longform."}
            </p>
            <div className="mt-4">
              <Pill onClick={restock} disabled={stocking}>
                {stocking ? "Researching…" : "Find videos"}
              </Pill>
            </div>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {viral.map((item) => (
              <VideoCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-16">
        <div className="flex items-end justify-between">
          <div>
            <p className="eyebrow text-muted">Today&apos;s ideas</p>
            <h2 className="display mt-2 text-[21px] text-ink">
              Three you could cut before noon
            </h2>
          </div>
          <Pill href="/app/ideas" variant="text">
            All ideas
          </Pill>
        </div>
        {loading ? (
          <div className="mt-5 grid gap-3">
            <Skeleton className="h-[70px]" />
            <Skeleton className="h-[70px]" />
          </div>
        ) : teaser.length === 0 ? null : (
          <div className="mt-5 grid gap-3">
            {teaser.map((item) => (
              <Link
                key={item.id}
                href={`/app/studio?v=${item.video.videoId}`}
                // min-w-0: a grid item defaults to min-width:auto, so the
                // truncating text below pushes the whole row past the viewport.
                className="group flex min-w-0 items-center justify-between gap-4 rounded-[var(--radius-card,16px)] bg-surface px-5 py-4 shadow-hairline transition-all duration-[var(--dur-base,240ms)] ease-[var(--ease-out-soft)] hover:-translate-y-[2px] hover:shadow-lift"
              >
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium text-ink">
                    {item.hook}
                  </p>
                  <p className="mt-1 truncate text-[13px] text-muted">
                    {item.video.channel} · {item.estimatedClipCount} possible cuts
                  </p>
                </div>
                <span className="tnum shrink-0 text-[14px] text-brand">{item.score}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {jobs.length ? (
        <section className="mt-16">
          <p className="eyebrow text-muted">Recent clips</p>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {jobs.slice(0, 6).map((job) => (
              <Link
                key={job.id}
                href={`/app/studio?v=${job.video.videoId}&clip=${job.candidate.id}`}
                className="min-w-[220px] rounded-[var(--radius-card,16px)] bg-surface p-4 shadow-hairline transition-all duration-[var(--dur-base,240ms)] hover:-translate-y-[2px] hover:shadow-lift"
              >
                <p className="text-[12px] capitalize text-muted">{job.status}</p>
                <p className="mt-2 line-clamp-2 text-[14px] font-medium text-ink">
                  {job.candidate.hook}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
