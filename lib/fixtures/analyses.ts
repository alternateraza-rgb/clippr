import type { AnalysisResult, ClipCandidate } from "@/lib/agent/types";
import {
  HOOK_WORDS,
  INTERVIEW_WORDS,
  LECTURE_WORDS,
  linesFromWords,
} from "@/lib/fixtures/captions";
import { VIDEOS } from "@/lib/fixtures/videos";

function candidate(
  partial: Omit<ClipCandidate, "captionLines"> & { captionLines?: ClipCandidate["captionLines"] },
  words = HOOK_WORDS,
): ClipCandidate {
  return {
    ...partial,
    captionLines: partial.captionLines ?? linesFromWords(words, 3),
  };
}

const LONG_EVENTS = [
  { stage: "resolve" as const, message: "Resolved · 4h 07m · The Compounding Desk with Jonathan P. Ellsworth-Morales", at: 0 },
  { stage: "transcribe" as const, message: "Pulling captions…", at: 420 },
  { stage: "transcribe" as const, message: "18,204 words · auto-generated English", at: 1600 },
  { stage: "score" as const, message: "Scoring 61 windows against the retention rubric", at: 2100 },
  { stage: "score" as const, message: "Found a 14s hook at 08:42 — “nobody tells you this part”", at: 3800 },
  { stage: "score" as const, message: "Weak close at 1:12:08 — payoff never lands (41)", at: 4600 },
  { stage: "compose" as const, message: "Composing 3 cuts · Hormozi captions · Minecraft parkour", at: 5400 },
  { stage: "done" as const, message: "Ready. Three clips worth posting.", at: 6200 },
];

export const ANALYSES: Record<string, AnalysisResult> = {
  [VIDEOS.longTitle.videoId]: {
    video: VIDEOS.longTitle,
    events: LONG_EVENTS,
    candidates: [
      candidate({
        id: "lt-1",
        start: 522,
        end: 543,
        hook: "Nobody tells you this part. If you have a job you hate, stop optimizing the wrong number.",
        whyItClips:
          "Opens on a forbidden-knowledge frame, names the viewer, and lands a one-line reframe before second 11. Self-contained.",
        score: 91,
        scores: { hook: 96, emotion: 84, selfContained: 93, quotability: 90, payoff: 88 },
      }),
      candidate({
        id: "lt-2",
        start: 1864,
        end: 1899,
        hook: "Income is a vanity metric. Keep the spread. That's the whole game.",
        whyItClips:
          "Quotable closer. Slightly slower open — still a clean 35s for Reels if you keep the last line on screen.",
        score: 84,
        scores: { hook: 80, emotion: 78, selfContained: 88, quotability: 94, payoff: 86 },
      }),
      candidate({
        id: "lt-3",
        start: 4328,
        end: 4361,
        hook: "I watched a man make $400,000 and still feel broke. Here's the spreadsheet.",
        whyItClips:
          "Story engine is strong; the spreadsheet beat is visual. Needs a tighter first two seconds.",
        score: 76,
        scores: { hook: 71, emotion: 82, selfContained: 74, quotability: 77, payoff: 79 },
      }),
    ],
  },
  [VIDEOS.interview.videoId]: {
    video: VIDEOS.interview,
    events: [
      { stage: "resolve", message: "Resolved · 1h 43m · Off Record", at: 0 },
      { stage: "transcribe", message: "Manual captions · English", at: 900 },
      { stage: "score", message: "Found the refusal at 22:11 — that's the cut", at: 2800 },
      { stage: "compose", message: "Composing 3 cuts", at: 4200 },
      { stage: "done", message: "Ready.", at: 5000 },
    ],
    candidates: [
      candidate(
        {
          id: "iv-1",
          start: 1331,
          end: 1352,
          hook: "She looked at me and said don't publish this. That's when I knew we had it.",
          whyItClips:
            "A complete scene in 21 seconds. The refusal is the hook; the last line is the button.",
          score: 88,
          scores: { hook: 92, emotion: 90, selfContained: 86, quotability: 85, payoff: 84 },
        },
        INTERVIEW_WORDS,
      ),
      candidate(
        {
          id: "iv-2",
          start: 2480,
          end: 2508,
          hook: "The tape doesn't lie.",
          whyItClips: "Short, punchy, slightly thin without the preceding beat. Good as a follow-up post.",
          score: 69,
          scores: { hook: 74, emotion: 70, selfContained: 61, quotability: 80, payoff: 64 },
        },
        INTERVIEW_WORDS,
      ),
    ],
  },
  [VIDEOS.lecture.videoId]: {
    video: VIDEOS.lecture,
    events: [
      { stage: "resolve", message: "Resolved · 40m · Studio Hours", at: 0 },
      { stage: "transcribe", message: "12,110 words · auto-generated", at: 1400 },
      { stage: "score", message: "Lecture density is high — few natural buttons", at: 3200 },
      { stage: "compose", message: "Composing 2 cuts", at: 4500 },
      { stage: "done", message: "Ready. Thin set — the idea is good, the energy is not.", at: 5300 },
    ],
    candidates: [
      candidate(
        {
          id: "lc-1",
          start: 612,
          end: 632,
          hook: "Attention is not a resource. It's a door. Most people leave it open.",
          whyItClips:
            "Aphoristic and complete. Soft delivery — pair with Hormozi captions or it dies in the first second.",
          score: 73,
          scores: { hook: 70, emotion: 58, selfContained: 90, quotability: 88, payoff: 68 },
        },
        LECTURE_WORDS,
      ),
    ],
  },
  [VIDEOS.lowScore.videoId]: {
    video: VIDEOS.lowScore,
    events: [
      { stage: "resolve", message: "Resolved · 30m · Desk Notes", at: 0 },
      { stage: "transcribe", message: "Captions found", at: 800 },
      { stage: "score", message: "No clean hook in the first 40 windows", at: 3000 },
      { stage: "done", message: "One candidate. I would not post this.", at: 4800 },
    ],
    candidates: [
      candidate({
        id: "ls-1",
        start: 110,
        end: 141,
        hook: "Markets were mixed. Here's what moved.",
        whyItClips:
          "Informational, not emotional. No open loop, no quotable line, payoff is a chart. Score reflects that.",
        score: 41,
        scores: { hook: 38, emotion: 28, selfContained: 62, quotability: 34, payoff: 48 },
      }),
    ],
  },
  [VIDEOS.noCaptions.videoId]: {
    video: VIDEOS.noCaptions,
    events: [
      { stage: "resolve", message: "Resolved · 1h 05m · Field Notes", at: 0 },
      { stage: "transcribe", message: "Captions are disabled on this video", at: 900 },
      { stage: "score", message: "Falling back to chapters and description", at: 1800 },
      { stage: "done", message: "No spoken captions — we can still cut, but karaoke will be empty.", at: 3600 },
    ],
    candidates: [
      candidate({
        id: "nc-1",
        start: 0,
        end: 24,
        hook: "Chapter 1 · Cold open (no transcript)",
        whyItClips:
          "Guessed from chapters. Without speech we cannot score a hook — treat this as a starting point, not a recommendation.",
        score: 52,
        scores: { hook: 50, emotion: 40, selfContained: 70, quotability: 30, payoff: 55 },
        captionLines: [],
      }),
    ],
  },
  [VIDEOS.story.videoId]: {
    video: VIDEOS.story,
    events: LONG_EVENTS,
    candidates: [
      candidate({
        id: "st-1",
        start: 88,
        end: 118,
        hook: "I lost $40,000 in 11 days. The trade wasn't the mistake.",
        whyItClips: "Personal stake in the first line. The reframe is the clip.",
        score: 87,
        scores: { hook: 94, emotion: 88, selfContained: 82, quotability: 86, payoff: 80 },
      }),
    ],
  },
};

export const DEFAULT_ANALYSIS = ANALYSES[VIDEOS.longTitle.videoId];

export function analysisFor(videoId: string): AnalysisResult {
  if (ANALYSES[videoId]) return ANALYSES[videoId];
  return {
    ...DEFAULT_ANALYSIS,
    video: {
      ...DEFAULT_ANALYSIS.video,
      videoId,
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    },
  };
}
