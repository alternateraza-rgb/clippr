import type { CaptionLine, WordTiming } from "@/lib/agent/types";

export function linesFromWords(words: WordTiming[], perLine = 3): CaptionLine[] {
  const lines: CaptionLine[] = [];
  for (let i = 0; i < words.length; i += perLine) {
    const chunk = words.slice(i, i + perLine);
    lines.push({
      start: chunk[0].start,
      end: chunk[chunk.length - 1].end,
      words: chunk,
    });
  }
  return lines;
}

export function words(pairs: Array<[string, number, number]>): WordTiming[] {
  return pairs.map(([text, start, end]) => ({ text, start, end }));
}

export const HOOK_WORDS = words([
  ["Nobody", 0, 0.38],
  ["tells", 0.38, 0.62],
  ["you", 0.62, 0.8],
  ["this", 0.8, 1.08],
  ["part.", 1.08, 1.55],
  ["If", 1.9, 2.08],
  ["you", 2.08, 2.22],
  ["have", 2.22, 2.4],
  ["a", 2.4, 2.48],
  ["job", 2.48, 2.78],
  ["you", 2.78, 2.94],
  ["hate,", 2.94, 3.4],
  ["stop", 3.7, 3.98],
  ["optimizing", 3.98, 4.62],
  ["the", 4.62, 4.74],
  ["wrong", 4.74, 5.1],
  ["number.", 5.1, 5.7],
  ["Income", 6.1, 6.5],
  ["is", 6.5, 6.66],
  ["a", 6.66, 6.74],
  ["vanity", 6.74, 7.2],
  ["metric.", 7.2, 7.8],
  ["Keep", 8.15, 8.4],
  ["the", 8.4, 8.52],
  ["spread.", 8.52, 9.15],
  ["That's", 9.5, 9.8],
  ["the", 9.8, 9.94],
  ["whole", 9.94, 10.22],
  ["game.", 10.22, 10.8],
]);

export const INTERVIEW_WORDS = words([
  ["She", 0, 0.28],
  ["looked", 0.28, 0.52],
  ["at", 0.52, 0.64],
  ["me", 0.64, 0.82],
  ["and", 0.82, 0.98],
  ["said", 0.98, 1.28],
  ["don't", 1.55, 1.8],
  ["publish", 1.8, 2.22],
  ["this.", 2.22, 2.7],
  ["That's", 3.1, 3.38],
  ["when", 3.38, 3.56],
  ["I", 3.56, 3.66],
  ["knew", 3.66, 3.92],
  ["we", 3.92, 4.08],
  ["had", 4.08, 4.24],
  ["it.", 4.24, 4.7],
  ["The", 5.05, 5.2],
  ["tape", 5.2, 5.48],
  ["doesn't", 5.48, 5.82],
  ["lie.", 5.82, 6.3],
]);

export const LECTURE_WORDS = words([
  ["Attention", 0, 0.62],
  ["is", 0.62, 0.78],
  ["not", 0.78, 1.0],
  ["a", 1.0, 1.1],
  ["resource.", 1.1, 1.7],
  ["It's", 2.05, 2.28],
  ["a", 2.28, 2.38],
  ["door.", 2.38, 2.9],
  ["Most", 3.25, 3.5],
  ["people", 3.5, 3.82],
  ["leave", 3.82, 4.1],
  ["it", 4.1, 4.24],
  ["open.", 4.24, 4.8],
]);
