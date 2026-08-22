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
export type JobStatus = "preview" | "queued" | "saved";

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

export type ClipCandidate = {
  id: string;
  start: number;
  end: number;
  hook: string;
  whyItClips: string;
  score: number;
  scores: ScoreBreakdown;
  captionLines: CaptionLine[];
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
