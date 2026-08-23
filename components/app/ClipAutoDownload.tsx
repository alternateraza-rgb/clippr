"use client";

import { useEffect, useRef } from "react";
import { useRenders } from "@/lib/hooks/useRenders";
import { clipFilename, downloadBlobUrl, hasDownloaded, markDownloaded } from "@/lib/download";

/**
 * Pulls a clip into the browser the moment it finishes rendering, from
 * anywhere in the app.
 *
 * Rendering outlives the Studio page — a clip takes minutes, and people
 * navigate away. Watching from the shell means the file still arrives, and
 * localStorage keeps it to one download per clip per machine.
 */
export function ClipAutoDownload() {
  const { renders } = useRenders();
  const inFlight = useRef(new Set<string>());

  useEffect(() => {
    const ready = renders.filter(
      (r) => r.status === "ready" && r.downloadUrl && !hasDownloaded(r.id) && !inFlight.current.has(r.id),
    );
    for (const render of ready) {
      inFlight.current.add(render.id);
      // Marked before the fetch resolves: a slow download must not be started
      // twice by the next four-second poll.
      markDownloaded(render.id);
      downloadBlobUrl(render.downloadUrl!, clipFilename(render.videoId, render.id)).catch(() => {
        inFlight.current.delete(render.id);
      });
    }
  }, [renders]);

  return null;
}
