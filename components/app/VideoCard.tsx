import Link from "next/link";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { formatDuration, formatRelativeDate } from "@/lib/format";
import type { DiscoveryItem } from "@/lib/agent/types";

export function VideoCard({ item }: { item: DiscoveryItem }) {
  return (
    <Link
      href={`/app/studio?v=${item.video.videoId}`}
      className="group flex flex-col overflow-hidden rounded-[12px] bg-surface shadow-hairline transition-all duration-200 hover:shadow-lift"
    >
      <div className="relative aspect-video overflow-hidden bg-surface-warm-alt">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.video.thumbnailUrl}
          alt=""
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />
        <span className="absolute bottom-2 right-2 rounded-[4px] bg-ink/80 px-1.5 py-0.5 text-[11px] tabular-nums text-on-brand">
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
        <h3 className="mt-2 line-clamp-2 font-display text-[17px] font-medium leading-snug tracking-tight">
          {item.video.title}
        </h3>
        <p className="mt-3 line-clamp-2 text-[13px] text-body">{item.whyItClips}</p>
      </div>
    </Link>
  );
}
