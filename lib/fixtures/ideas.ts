import type { DiscoveryItem, Niche } from "@/lib/agent/types";
import { VIDEOS } from "@/lib/fixtures/videos";

export const IDEAS: DiscoveryItem[] = [
  {
    id: "idea-1",
    video: VIDEOS.longTitle,
    niche: "finance",
    score: 91,
    hook: "Nobody tells you this part.",
    whyItClips: "A 4-hour lecture with a 14-second cold open that already sounds like a Short.",
    estimatedClipCount: 7,
    platforms: ["youtube", "tiktok"],
  },
  {
    id: "idea-2",
    video: VIDEOS.story,
    niche: "finance",
    score: 87,
    hook: "I lost $40,000 in 11 days.",
    whyItClips: "Confession + lesson. Native storytime energy for Reels.",
    estimatedClipCount: 4,
    platforms: ["youtube", "tiktok", "instagram"],
  },
  {
    id: "idea-3",
    video: VIDEOS.interview,
    niche: "podcasts",
    score: 88,
    hook: "Don't publish this.",
    whyItClips: "The refusal is the entire hook. One scene, one button.",
    estimatedClipCount: 5,
    platforms: ["youtube", "tiktok"],
  },
  {
    id: "idea-4",
    video: VIDEOS.lowScore,
    niche: "finance",
    score: 41,
    hook: "Markets were mixed.",
    whyItClips: "Included so you can see a miss. Informational wrap — I would skip it.",
    estimatedClipCount: 1,
    platforms: ["youtube"],
  },
  {
    id: "idea-5",
    video: VIDEOS.lecture,
    niche: "self-improvement",
    score: 73,
    hook: "Attention is not a resource.",
    whyItClips: "Aphorism-dense. Soft delivery — captions have to do the work.",
    estimatedClipCount: 3,
    platforms: ["instagram", "tiktok"],
  },
  {
    id: "idea-6",
    video: VIDEOS.noCaptions,
    niche: "finance",
    score: 52,
    hook: "Raw tape. No captions.",
    whyItClips: "Captions disabled. We can still cut from chapters, but karaoke will be empty.",
    estimatedClipCount: 2,
    platforms: ["youtube"],
  },
  {
    id: "idea-7",
    video: VIDEOS.faith,
    niche: "faith",
    score: 79,
    hook: "The part of the sermon nobody clips.",
    whyItClips: "Quiet room, heavy line. Faith shorts hold watch time if you don't over-caption.",
    estimatedClipCount: 3,
    platforms: ["youtube", "instagram"],
  },
  {
    id: "idea-8",
    video: VIDEOS.tech,
    niche: "tech",
    score: 82,
    hook: "He built it in a weekend and it still works.",
    whyItClips: "Builder myth in one sentence. Demo B-roll writes itself.",
    estimatedClipCount: 4,
    platforms: ["youtube", "tiktok"],
  },
];

export function ideasForNiche(niche: Niche) {
  const matched = IDEAS.filter((idea) => idea.niche === niche);
  if (matched.length >= 2) return matched;
  return IDEAS.slice(0, 3);
}

export function ideaByVideoId(videoId: string) {
  return IDEAS.find((idea) => idea.video.videoId === videoId) ?? null;
}
