import type { VideoMeta } from "@/lib/agent/types";
import { thumbnailFor } from "@/lib/youtube";

function video(
  videoId: string,
  title: string,
  channel: string,
  durationS: number,
  publishedAt: string,
  captionsAvailable = true,
): VideoMeta {
  return {
    videoId,
    title,
    channel,
    durationS,
    thumbnailUrl: thumbnailFor(videoId),
    publishedAt,
    captionsAvailable,
    chapters: captionsAvailable
      ? [
          { start: 0, title: "Cold open" },
          { start: 420, title: "The claim" },
          { start: 1860, title: "The part they cut" },
        ]
      : undefined,
  };
}

export const VIDEOS = {
  longTitle: video(
    "jNQXAC9IVRw",
    "I spent 4 hours explaining why most people never get rich and the last 11 minutes is the only part that actually matters if you have a real job and a family",
    "The Compounding Desk with Jonathan P. Ellsworth-Morales",
    14820,
    "2026-08-09T14:00:00.000Z",
  ),
  interview: video(
    "M7lc1UVf-VE",
    "The interview they asked me not to post",
    "Off Record",
    6234,
    "2026-08-11T09:30:00.000Z",
  ),
  lecture: video(
    "aqz-KE-bpKQ",
    "A quiet lecture on attention",
    "Studio Hours",
    2410,
    "2026-08-07T18:12:00.000Z",
  ),
  lowScore: video(
    "YE7VzlLtp-4",
    "Weekly market wrap — August 10",
    "Desk Notes",
    1844,
    "2026-08-10T21:00:00.000Z",
  ),
  noCaptions: video(
    "LXb3EKWsInQ",
    "Raw tape from the floor (no captions)",
    "Field Notes",
    3902,
    "2026-08-12T11:00:00.000Z",
    false,
  ),
  story: video(
    "sNPnbI1arSE",
    "I lost $40,000 in 11 days",
    "Maya after hours",
    2715,
    "2026-08-13T16:40:00.000Z",
  ),
  faith: video(
    "9bZkp7q19f0",
    "The part of the sermon nobody clips",
    "Northside",
    3310,
    "2026-08-08T10:00:00.000Z",
  ),
  tech: video(
    "kJQP7kiw5Fk",
    "He built it in a weekend and it still works",
    "Build Log",
    1988,
    "2026-08-06T13:22:00.000Z",
  ),
} satisfies Record<string, VideoMeta>;

export const VIDEO_LIST = Object.values(VIDEOS);

export function videoById(id: string) {
  return VIDEO_LIST.find((v) => v.videoId === id) ?? null;
}
