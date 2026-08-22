"use client";

import Link from "next/link";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { useJobs } from "@/lib/store/jobs";
import { formatRelativeDate, formatTimestamp } from "@/lib/format";

export default function LibraryPage() {
  const { jobs } = useJobs();

  return (
    <div>
      <p className="text-[13px] font-medium text-muted">Library</p>
      <h1 className="display mt-2 text-[28px] text-ink">Cuts you already made</h1>
      <p className="mt-2 max-w-[44ch] text-body">
        Re-open any job in Studio. Duplicate it with a different caption style
        once export is live.
      </p>

      {jobs.length === 0 ? (
        <p className="mt-16 text-body">Nothing saved yet. The first clip lands here.</p>
      ) : (
        <div className="mt-10 grid gap-3">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/app/studio?v=${job.video.videoId}&clip=${job.candidate.id}`}
              className="flex flex-col gap-4 rounded-[12px] bg-surface p-5 shadow-hairline transition-all hover:shadow-lift sm:flex-row sm:items-center"
            >
              <div className="relative h-20 w-36 shrink-0 overflow-hidden rounded-[8px] bg-surface-warm-alt">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={job.video.thumbnailUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] capitalize tabular-nums text-muted">
                  {job.status} · {formatRelativeDate(job.createdAt)} ·{" "}
                  {formatTimestamp(job.candidate.start)}
                </p>
                <h2 className="mt-1 line-clamp-2 text-[16px] font-medium text-ink">
                  {job.candidate.hook}
                </h2>
                <p className="mt-1 truncate text-[13px] text-muted">
                  {job.video.title}
                </p>
              </div>
              <ScoreRing score={job.candidate.score} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
