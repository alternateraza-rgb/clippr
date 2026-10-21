import type {
  CaptionPreset,
  GameplayTrack,
  Niche,
  RenderStatus,
  ScoreBreakdown,
  StorySegment,
} from "@/lib/agent/types";

/**
 * One reel, cut down to what a chart can use. The stored candidate also holds
 * caption timings for every word — far too heavy to ship a library's worth of
 * just to count them.
 */
export type ReelRecord = {
  id: string;
  videoId: string;
  status: RenderStatus;
  createdAt: string;
  finishedAt: string | null;
  /** Seconds of finished video. Null until the worker has measured it. */
  durationS: number | null;
  gameplay: GameplayTrack | null;
  captionPreset: CaptionPreset | null;
  asrSource: "captions" | "whisper" | null;
  genre: Niche | null;
  topic: string | null;
  hook: string | null;
  score: number | null;
  scores: ScoreBreakdown | null;
  roles: StorySegment["role"][];
};

export type SourceVideo = {
  title: string;
  channel: string;
  durationS: number;
  thumbnailUrl: string;
};

export type StatsPayload = {
  reels: ReelRecord[];
  videos: Record<string, SourceVideo>;
  /** Signed poster frames for the highest-scoring reels, by reel id. */
  posters: Record<string, string>;
  /** Reels still waiting on a genre — the page offers to sort them. */
  unsorted: number;
};
