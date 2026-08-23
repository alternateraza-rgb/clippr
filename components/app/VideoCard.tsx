import Link from "next/link";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { formatDuration, formatRelativeDate } from "@/lib/format";
import type { DiscoveryItem } from "@/lib/agent/types";

export function VideoCard({ item }: { item: DiscoveryItem }) {
  return (
    <Link
      href={`/app/studio?v=${item.video.videoId}`}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-card,16px)] bg-surface shadow-hairline transition-all duration-[var(--dur-base,240ms)] ease-[var(--ease-out-soft)] hover:-translate-y-[3px] hover:shadow-lift"
    >
      <div className="relative aspect-video overflow-hidden bg-surface-warm-alt">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.video.thumbnailUrl}
          alt=""
          className="h-full w-full object-cover transition-transform duration-[var(--dur-slow,520ms)] ease-[var(--ease-out-soft)] group-hover:scale-[1.04]"
        />
        <span className="tnum absolute bottom-2 right-2 rounded-full bg-ink/75 px-2 py-0.5 text-[11px] text-on-brand backdrop-blur-sm">
          {formatDuration(item.video.durationS)}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[12px] text-muted">
            {item.video.channel} · {formatRelativeDate(item.video.publishedAt)}
          </p>
          <ScoreRing score={item.score} size={40} />
        </div>
        <h3 className="display mt-2 line-clamp-2 text-[17px] leading-snug text-ink">
          {item.video.title}
        </h3>
        <p className="mt-3 line-clamp-2 text-[13px] text-body">{item.whyItClips}</p>
      </div>
    </Link>
  );
}
