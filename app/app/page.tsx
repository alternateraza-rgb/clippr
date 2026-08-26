"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, RefreshCw, Sparkles } from "lucide-react";
import { IdeaCard } from "@/components/app/IdeaCard";
import { IdeaSheet } from "@/components/app/IdeaSheet";
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
      <h1 className="display mt-2.5 text-[clamp(28px,3.8vw,42px)] text-ink">
        {greetingForNow(profile.displayName)}
      </h1>

      {/* The one thing this page is for. Dark so it reads as the primary
          surface rather than another card in a stack of cards. */}
      <section className="mt-7 overflow-hidden rounded-[var(--radius-panel)] bg-void p-6 text-white md:p-8">
        <h2 className="display text-[21px] text-white md:text-[24px]">
          Paste a long video. Get one clip worth posting.
        </h2>
        <p className="mt-2 max-w-[52ch] text-[14.5px] leading-relaxed text-white/60">
          Clipmuse listens to the whole thing, picks the strongest minute, and
          edits it — captions burned in, framed vertical, ready to upload.
        </p>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <input
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") go();
            }}
            placeholder="https://youtube.com/watch?v=…"
            aria-label="YouTube link"
            className="min-w-0 flex-1 rounded-[var(--radius-pill)] bg-white/10 px-5 py-3.5 text-[15px] text-white outline-none ring-1 ring-inset ring-white/15 transition-shadow placeholder:text-white/40 focus:ring-2 focus:ring-white/60"
          />
          <button
            type="button"
            onClick={go}
            className="shrink-0 rounded-[var(--radius-pill)] bg-brand px-7 py-3.5 text-[15px] font-semibold text-on-brand shadow-[inset_0_1px_0_rgb(255_255_255/0.22)] transition-colors hover:bg-brand-hover active:scale-[0.98]"
          >
            Clip it
          </button>
        </div>

        {error ? <p className="mt-3 text-[13.5px] text-brand-tint">{error}</p> : null}

        <p className="mt-4 text-[12.5px] text-white/40">
          Works best on 8 minutes or more — podcasts, interviews, streams, sermons.
        </p>
      </section>

      {jobs.length ? (
        <section className="mt-10">
          <h2 className="eyebrow text-ink">Picking up where you left off</h2>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
            {jobs.slice(0, 6).map((job) => (
              <Link
                key={job.id}
                href={`/app/studio?v=${job.video.videoId}&clip=${job.candidate.id}`}
                className="min-w-[240px] rounded-[var(--radius-card)] bg-surface p-4 shadow-hairline transition-shadow duration-[var(--dur-base)] hover:shadow-lift"
              >
                <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-brand">
                  {job.status}
                </p>
                <p className="mt-2 line-clamp-2 text-[14px] font-medium leading-snug text-ink">
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
            <p className="mt-2 text-[15px] text-body">
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
    <div className="mt-5 rounded-[var(--radius-card)] bg-surface p-8 text-center shadow-hairline">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft">
        <Sparkles className="h-5 w-5 text-brand" strokeWidth={2} />
      </span>
      <p className="mx-auto mt-4 max-w-[42ch] text-[15px] leading-relaxed text-body">
        {live
          ? "Nothing in the feed for this niche yet. Send Clipmuse out to find some."
          : "No ideas queued up right now. Paste a link above to cut one yourself."}
      </p>
      <div className="mt-5">
        <Pill
          onClick={onRestock}
          loading={stocking}
          icon={<RefreshCw className="h-4 w-4" strokeWidth={2} />}
        >
          {stocking ? "Researching…" : "Find videos"}
        </Pill>
      </div>
    </div>
  );
}
