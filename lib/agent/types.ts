export type Platform = "youtube" | "tiktok" | "instagram";
export type Niche =
  | "finance"
  | "true-crime"
  | "podcasts"
  | "sports"
  | "fitness"
  | "faith"
  | "comedy"
  | "tech"
  | "politics"
  | "storytime"
  | "self-improvement"
  | "gaming";
export type CaptionPreset = "hormozi" | "clean" | "karaoke";
export type GameplayTrack = "gta" | "minecraft" | "subway" | "none";
export type NicheSource = "manual" | "picked";
export type AgentStage = "resolve" | "transcribe" | "score" | "compose" | "done";
export type JobStatus =
  | "preview"
  | "queued"
  | "saved"
  | "downloading"
  | "transcribing"
  | "scoring"
  | "rendering"
  | "ready"
  | "failed";

export type WordTiming = {
  start: number;
  end: number;
  text: string;
};

export type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
  words?: WordTiming[];
};

export type CaptionLine = {
  start: number;
  end: number;
  words: WordTiming[];
};

export type ScoreBreakdown = {
  hook: number;
  emotion: number;
  selfContained: number;
  quotability: number;
  payoff: number;
};

/** One span of the source tape, and the job it does in the story. */
export type StorySegment = {
  start: number;
  end: number;
  /** Verbatim opening words, used to anchor the span to the transcript. */
  quote: string;
  role: "setup" | "beat" | "turn" | "payoff";
};

export type ClipCandidate = {
  id: string;
  /** Outer span: the first segment's start to the last one's end. */
  start: number;
  end: number;
  hook: string;
  whyItClips: string;
  score: number;
  scores: ScoreBreakdown;
  captionLines: CaptionLine[];
  /** What the clip is about, in the model's words. */
  topic?: string;
  /**
   * The spans that make up the clip, in the order they play. A single segment
   * spanning start..end is the floor, and is what a one-window clip looks like.
   */
  segments?: StorySegment[];
};

export type CompositionSpec = {
  videoId: string;
  start: number;
  end: number;
  gameplay: GameplayTrack;
  captionPreset: CaptionPreset;
  captionLines: CaptionLine[];
};

export type VideoMeta = {
  videoId: string;
  title: string;
  channel: string;
  durationS: number;
  thumbnailUrl: string;
  publishedAt: string;
  chapters?: { start: number; title: string }[];
  captionsAvailable: boolean;
  viewCount?: number;
  channelId?: string;
  description?: string;
};

export type DiscoveryItem = {
  id: string;
  video: VideoMeta;
  niche: Niche;
  score: number;
  hook: string;
  whyItClips: string;
  estimatedClipCount: number;
  platforms: Platform[];
  llmRationale?: string;
};

export type RenderStatus =
  | "queued"
  | "downloading"
  | "transcribing"
  | "scoring"
  | "rendering"
  | "ready"
  | "failed";

export type ClipRender = {
  id: string;
  jobId?: string | null;
  videoId: string;
  status: RenderStatus;
  progress: number;
  error?: string | null;
  outputPath?: string | null;
  downloadUrl?: string | null;
  posterUrl?: string | null;
  durationS?: number | null;
  startS?: number | null;
  endS?: number | null;
  createdAt: string;
  finishedAt?: string | null;
  hook?: string;
  topic?: string;
  why?: string;
  segmentCount?: number;
};

export type Profile = {
  displayName: string;
  platforms: Platform[];
  niche: Niche;
  interests: string[];
  nicheSource: NicheSource;
  captionPreset: CaptionPreset;
  defaultGameplay: GameplayTrack;
  onboardingComplete: boolean;
};

export type AgentEvent = {
  stage: AgentStage;
  message: string;
  at: number;
};

export type ClipJob = {
  id: string;
  video: VideoMeta;
  candidate: ClipCandidate;
  composition: CompositionSpec;
  status: JobStatus;
  createdAt: string;
};

export type AnalysisResult = {
  video: VideoMeta;
  candidates: ClipCandidate[];
  events: AgentEvent[];
  scoreSource?: "llm" | "heuristic";
};

export type NicheMeta = {
  id: Niche;
  label: string;
  blurb: string;
  opportunity: number;
  competition: number;
  evergreen: number;
  monetization: number;
};
