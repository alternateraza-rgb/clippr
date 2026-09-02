import type { WordTiming } from "@/lib/agent/types";

function normalize(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Whether a transcript word is the word the model quoted.
 *
 * Not `includes` in either direction: that made "the" match "there", "they" and
 * "them", so a quote built mostly from function words could anchor almost
 * anywhere. Exact, or a shared prefix long enough to be the same word inflected
 * differently — "invest" / "investing" — and nothing shorter.
 */
function sameWord(word: string, token: string) {
  if (word === token) return true;
  const shorter = Math.min(word.length, token.length);
  if (shorter < 4) return false;
  return word.slice(0, shorter) === token.slice(0, shorter);
}

/**
 * The words of a quote worth matching on.
 *
 * Short function words are dropped because they match everywhere, but dropping
 * everything under three letters threw away whole quotes: "and that was it"
 * reduced to two tokens and failed the minimum, so a correctly-quoted ending
 * fell through to a clock-derived boundary. Keep two-letter words when the
 * quote needs them to reach a usable length.
 */
function quoteTokens(phrase: string): string[] {
  const all = normalize(phrase).split(" ").filter(Boolean);
  const strong = all.filter((t) => t.length > 2);
  return strong.length >= 3 ? strong : all.filter((t) => t.length >= 2);
}

/**
 * Index of the word where `phrase` starts, or -1.
 *
 * Timestamps from a model drift; the words it quotes do not. Locating the
 * quote is what keeps a segment on the line it was chosen for.
 */
/**
 * First and last word index of `phrase`, so a caller can end a segment exactly
 * where the quoted line ends.
 */
export function findPhraseSpan(
  words: WordTiming[],
  phrase: string,
  near?: number,
): { from: number; to: number } | null {
  // "first-after", not "nearest": this is called with the segment's own start,
  // and the nearest match to that can sit *before* it. The caller then rejects
  // the backwards span and falls through to a clock-derived end — the exact
  // mid-sentence cut this function exists to prevent.
  const from = findPhrase(words, phrase, near, "first-after");
  if (from < 0) return null;
  const tokens = quoteTokens(phrase);
  // Walk forward over the same tokens to find where the quote stops.
  //
  // Skips are bounded: an unbounded lenient walk lets a short token like "it"
  // match a word far past the end of the quote, which dragged segment ends
  // several words beyond the sentence the model actually chose.
  let matched = 0;
  let skips = 0;
  let k = from;
  let last = from;
  while (matched < tokens.length && k < words.length && skips <= 2) {
    const word = normalize(words[k].text);
    const token = tokens[matched];
    if (word && sameWord(word, token)) {
      matched += 1;
      last = k;
      skips = 0;
    } else if (word) {
      skips += 1;
    }
    k += 1;
  }
  return { from, to: last };
}

export function findPhrase(
  words: WordTiming[],
  phrase: string,
  near?: number,
  /** "nearest" to `near`, or the first match at or after it. */
  mode: "nearest" | "first-after" = "nearest",
): number {
  if (!words.length) return -1;
  const tokens = quoteTokens(phrase).slice(0, 7);
  if (tokens.length < 3) return -1;

  const texts = words.map((w) => normalize(w.text));
  const hits: number[] = [];
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
      if (sameWord(word, token)) {
        matched += 1;
        k += 1;
        continue;
      }
      if (matched === 0) break;
      k += 1;
    }
    if (matched >= Math.min(4, tokens.length)) hits.push(i);
  }
  if (!hits.length) return -1;
  if (near == null) return hits[0];
  const target = near;
  if (mode === "first-after") {
    // A hair of tolerance, so a closing quote that begins on the segment's own
    // first word still counts as being at or after it.
    const forward = hits.find((i) => words[i].start >= target - 0.25);
    return forward ?? -1;
  }
  // People repeat themselves, so a phrase can match in several places. The
  // model's timestamp is rough but it is not random — take the match nearest
  // to it rather than the first one in the tape.
  return hits.reduce((best, i) =>
    Math.abs(words[i].start - target) < Math.abs(words[best].start - target) ? i : best,
  );
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
