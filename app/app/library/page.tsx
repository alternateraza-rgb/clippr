"use client";

import Link from "next/link";
import { useRenders } from "@/lib/hooks/useRenders";
import { clipFilename, downloadBlobUrl } from "@/lib/download";
import { formatRelativeDate, formatTimestamp } from "@/lib/format";

export default function LibraryPage() {
  const { renders, loading } = useRenders();
  const finished = renders.filter((r) => r.status === "ready" && r.downloadUrl);
  const pending = renders.filter((r) => r.status !== "ready");

  return (
    <div>
      <p className="text-[13px] font-medium text-muted">Library</p>
      <h1 className="display mt-2 text-[28px] text-ink">Clips you already cut</h1>
      <p className="mt-2 max-w-[44ch] text-body">
        Every finished clip downloads on its own. They stay here if you need
        another copy.
      </p>

      {finished.length ? (
        <div className="mt-10 grid gap-3">
          {finished.map((render) => (
            <div
              key={render.id}
              className="flex flex-col gap-3 rounded-[12px] bg-surface p-5 shadow-hairline sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[12px] tabular-nums text-muted">
                  {formatRelativeDate(render.createdAt)}
                  {render.startS != null && render.endS != null
                    ? ` · ${formatTimestamp(render.startS)} – ${formatTimestamp(render.endS)}`
                    : ""}
                </p>
                <h2 className="mt-1 line-clamp-2 text-[16px] font-medium text-ink">
                  {render.hook || render.videoId}
                </h2>
              </div>
              <button
                type="button"
                onClick={() =>
                  downloadBlobUrl(render.downloadUrl!, clipFilename(render.videoId, render.id))
                }
                className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-2.5 text-[14px] text-on-brand"
              >
                Download again
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {/* Not clips yet, so they are not in the list above — but a render that
          failed has to say so somewhere, or the clip just never appears. */}
      {pending.length ? (
        <section className="mt-10">
          <p className="text-[13px] font-medium text-muted">In progress</p>
          <div className="mt-4 grid gap-2">
            {pending.map((render) => (
              <div
                key={render.id}
                className="flex flex-col gap-2 rounded-[12px] bg-surface px-5 py-4 shadow-hairline sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-[12px] capitalize tabular-nums text-muted">
                    {render.status}
                    {render.progress ? ` · ${render.progress}%` : ""} ·{" "}
                    {formatRelativeDate(render.createdAt)}
                  </p>
                  <p className="mt-1 truncate text-[14px] text-ink">
                    {render.hook || render.videoId}
                  </p>
                  {render.error ? (
                    <p className="mt-1 text-[13px] text-brand">{render.error}</p>
                  ) : null}
                </div>
                <Link
                  href={`/app/studio?v=${render.videoId}`}
                  className="shrink-0 text-[13px] text-muted underline-offset-4 hover:underline"
                >
                  Open in studio
                </Link>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {!loading && renders.length === 0 ? (
        <p className="mt-16 text-body">Nothing here yet. Export a clip and it lands here.</p>
      ) : null}
    </div>
  );
}
