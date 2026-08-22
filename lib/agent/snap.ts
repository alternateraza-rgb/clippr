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
