import type { WordTiming } from "@/lib/agent/types";

function normalize(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

/** Move an LLM window onto the transcript phrase it quoted, so 0:02 is not used for a line at 45:12. */
export function snapRange(
  start: number,
  end: number,
  hook: string,
  words: WordTiming[],
): { start: number; end: number } {
  if (!words.length) return { start, end };
  const tokens = normalize(hook)
    .split(" ")
    .filter((t) => t.length > 2)
    .slice(0, 7);
  if (tokens.length < 3) return { start, end };

  const texts = words.map((w) => normalize(w.text));
  let best = -1;
  for (let i = 0; i < texts.length; i++) {
    let matched = 0;
    let k = i;
    while (matched < tokens.length && k < texts.length && k - i < 48) {
      const token = tokens[matched];
      const word = texts[k];
      if (!word) {
        k += 1;
        continue;
      }
      if (word === token || word.includes(token) || token.includes(word)) {
        matched += 1;
        k += 1;
        continue;
      }
      if (matched === 0) break;
      k += 1;
    }
    if (matched >= Math.min(4, tokens.length)) {
      best = i;
      break;
    }
  }
  if (best < 0) return { start, end };

  const from = words[best].start;
  const want = Math.max(12, Math.min(40, end - start || 20));
  let to = from + want;
  const last = words.find((w) => w.start >= to) ?? words[words.length - 1];
  to = Math.max(from + 8, Math.min(last.end, from + 45));
  return { start: from, end: to };
}

const FILLER_WORDS = new Set([
  "um",
  "umm",
  "uh",
  "uhh",
  "ah",
  "er",
  "erm",
  "like",
  "so",
  "okay",
  "ok",
  "alright",
  "well",
  "actually",
  "basically",
  "literally",
  "anyway",
  "anyways",
]);
const PHRASE_FILLERS: [string, string][] = [
  ["you", "know"],
  ["i", "mean"],
  ["kind", "of"],
  ["sort", "of"],
];

function phraseFillerLen(words: WordTiming[], i: number): number {
  if (i + 1 >= words.length) return 0;
  const a = normalize(words[i].text);
  const b = normalize(words[i + 1].text);
  return PHRASE_FILLERS.some(([x, y]) => x === a && y === b) ? 2 : 0;
}

/**
 * Mechanical "tighten the cut" pass: trims leading/trailing filler words a
 * human editor would cut, then prefers to end on a sentence boundary rather
 * than mid-thought — independent of how good the model's raw guess was.
 */
export function tightenRange(
  words: WordTiming[],
  start: number,
  end: number,
  opts?: { minDuration?: number },
): { start: number; end: number } {
  if (words.length < 4) return { start, end };
  const minDuration = opts?.minDuration ?? 8;

  const i0Start = words.findIndex((w) => w.end > start);
  let i1 = -1;
  for (let i = words.length - 1; i >= 0; i--) {
    if (words[i].start < end) {
      i1 = i;
      break;
    }
  }
  if (i0Start < 0 || i1 < 0 || i0Start >= i1) return { start, end };
  let i0 = i0Start;

  while (i0 < i1) {
    const plen = phraseFillerLen(words, i0);
    if (plen && words[i1].end - words[i0 + plen].start >= minDuration) {
      i0 += plen;
      continue;
    }
    if (!plen && FILLER_WORDS.has(normalize(words[i0].text)) && words[i1].end - words[i0 + 1].start >= minDuration) {
      i0 += 1;
      continue;
    }
    break;
  }

  while (i1 > i0 && FILLER_WORDS.has(normalize(words[i1].text)) && words[i1 - 1].end - words[i0].start >= minDuration) {
    i1 -= 1;
  }

  if (!/[.!?]$/.test(words[i1].text.trim())) {
    const cap = Math.min(words.length - 1, i1 + 8);
    for (let k = i1 + 1; k <= cap; k++) {
      if (words[k].end - end > 8) break;
      if (/[.!?]$/.test(words[k].text.trim())) {
        i1 = k;
        break;
      }
    }
  }

  return { start: Math.max(0, words[i0].start), end: words[i1].end };
}
