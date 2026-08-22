"use client";

import Link from "next/link";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { useJobs } from "@/lib/store/jobs";
import { useRenders } from "@/lib/hooks/useRenders";
import { formatRelativeDate, formatTimestamp } from "@/lib/format";

export default function LibraryPage() {
  const { jobs } = useJobs();
  const { renders } = useRenders();

  return (
    <div>
      <p className="text-[13px] font-medium text-muted">Library</p>
      <h1 className="display mt-2 text-[28px] text-ink">Cuts you already made</h1>
      <p className="mt-2 max-w-[44ch] text-body">
        Saved moments stay here. Exports render in the background, then you
        download the captioned mp4.
      </p>

      {renders.length ? (
        <section className="mt-10">
          <p className="text-[13px] font-medium text-muted">Exports</p>
          <div className="mt-4 grid gap-3">
            {renders.map((render) => (
              <div
                key={render.id}
                className="flex flex-col gap-3 rounded-[12px] bg-surface p-5 shadow-hairline sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] capitalize tabular-nums text-muted">
                    {render.status}
                    {render.progress ? ` · ${render.progress}%` : ""} ·{" "}
                    {formatRelativeDate(render.createdAt)}
                  </p>
                  <h2 className="mt-1 line-clamp-2 text-[16px] font-medium text-ink">
                    {render.hook || render.videoId}
                  </h2>
                  {render.error ? (
                    <p className="mt-1 text-[13px] text-brand">{render.error}</p>
                  ) : (
                    <p className="mt-1 text-[13px] text-muted">
                      {render.startS != null && render.endS != null
                        ? `${formatTimestamp(render.startS)} – ${formatTimestamp(render.endS)}`
                        : render.videoId}
                    </p>
                  )}
                </div>
                {render.status === "ready" && render.downloadUrl ? (
                  <a
                    href={render.downloadUrl}
                    className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-2.5 text-[14px] text-on-brand"
                  >
                    Download mp4
                  </a>
                ) : (
                  <Link
                    href={`/app/studio?v=${render.videoId}`}
                    className="text-[13px] text-muted underline-offset-4 hover:underline"
                  >
                    Open in studio
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {jobs.length === 0 && renders.length === 0 ? (
        <p className="mt-16 text-body">Nothing saved yet. The first clip lands here.</p>
      ) : jobs.length === 0 ? null : (
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
