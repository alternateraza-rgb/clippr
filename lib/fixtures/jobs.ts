import type { ClipJob } from "@/lib/agent/types";
import { ANALYSES } from "@/lib/fixtures/analyses";
import { VIDEOS } from "@/lib/fixtures/videos";

const long = ANALYSES[VIDEOS.longTitle.videoId];
const story = ANALYSES[VIDEOS.story.videoId];
const interview = ANALYSES[VIDEOS.interview.videoId];

export const JOBS: ClipJob[] = [
  {
    id: "job-1",
    video: VIDEOS.longTitle,
    candidate: long.candidates[0],
    composition: {
      videoId: VIDEOS.longTitle.videoId,
      start: long.candidates[0].start,
      end: long.candidates[0].end,
      gameplay: "minecraft",
      captionPreset: "hormozi",
      captionLines: long.candidates[0].captionLines,
    },
    status: "saved",
    createdAt: "2026-08-13T19:20:00.000Z",
  },
  {
    id: "job-2",
    video: VIDEOS.story,
    candidate: story.candidates[0],
    composition: {
      videoId: VIDEOS.story.videoId,
      start: story.candidates[0].start,
      end: story.candidates[0].end,
      gameplay: "gta",
      captionPreset: "karaoke",
      captionLines: story.candidates[0].captionLines,
    },
    status: "queued",
    createdAt: "2026-08-14T02:05:00.000Z",
  },
  {
    id: "job-3",
    video: VIDEOS.interview,
    candidate: interview.candidates[0],
    composition: {
      videoId: VIDEOS.interview.videoId,
      start: interview.candidates[0].start,
      end: interview.candidates[0].end,
      gameplay: "none",
      captionPreset: "clean",
      captionLines: interview.candidates[0].captionLines,
    },
    status: "preview",
    createdAt: "2026-08-12T15:44:00.000Z",
  },
];
