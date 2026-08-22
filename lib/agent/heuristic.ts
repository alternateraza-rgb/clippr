import { captionLinesForRange } from "@/lib/agent/compose";
import { weightedScore } from "@/lib/format";
import type { ClipCandidate, ScoreBreakdown, WordTiming } from "@/lib/agent/types";

const HOOKISH =
  /\b(nobody|secret|wait|actually|stop|never|always|here's|here is|the truth|don't|money|rich|broke|lost|won|insane|crazy)\b/i;
const QUESTION = /\?/;

function windows(_duration: number, words: WordTiming[]) {
  const last = words[words.length - 1]?.end ?? _duration;
  const len = 28;
  const hop = 14;
  const out: Array<{ start: number; end: number; text: string }> = [];
  for (let t = 0; t + 12 < last; t += hop) {
    const start = t;
    const end = Math.min(t + len, last);
    const text = words
      .filter((w) => w.start >= start && w.start < end)
      .map((w) => w.text)
      .join(" ");
    if (text.split(" ").length >= 12) out.push({ start, end, text });
  }
  return out;
}

function scoreWindow(text: string): ScoreBreakdown {
  const hook = Math.min(92, 40 + (HOOKISH.test(text.slice(0, 80)) ? 35 : 0) + (QUESTION.test(text.slice(0, 90)) ? 12 : 0));
  const emotion = Math.min(88, 38 + (HOOKISH.test(text) ? 22 : 0) + Math.min(text.length / 40, 20));
  const selfContained = text.length > 80 && text.length < 520 ? 78 : 58;
  const quotability = HOOKISH.test(text) ? 74 : 48;
  const payoff = /\.|!/.test(text.slice(-40)) ? 70 : 50;
  return { hook, emotion, selfContained, quotability, payoff };
}

export function heuristicCandidates(words: WordTiming[], limit = 4): ClipCandidate[] {
  if (!words.length) return [];
  const duration = words[words.length - 1].end;
  const ranked = windows(duration, words)
    .map((w, i) => {
      const scores = scoreWindow(w.text);
      const score = weightedScore(scores);
      const hook = w.text.split(/(?<=[.!?])\s/)[0]?.slice(0, 140) || w.text.slice(0, 120);
      return {
        id: `h-${i}`,
        start: Math.round(w.start * 10) / 10,
        end: Math.round(w.end * 10) / 10,
        hook,
        whyItClips:
          score >= 70
            ? "Dense, hooky language in a self-contained window. Heuristic pick until the LLM is configured."
            : "Best available window on a weak tape. Heuristic score — treat as a starting cut.",
        score,
        scores,
        captionLines: captionLinesForRange(words, w.start, w.end),
      } satisfies ClipCandidate;
    })
    .sort((a, b) => b.score - a.score);
  const picked: ClipCandidate[] = [];
  for (const c of ranked) {
    if (picked.some((p) => Math.abs(p.start - c.start) < 12)) continue;
    picked.push(c);
    if (picked.length >= limit) break;
  }
  return picked;
}
