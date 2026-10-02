/** Headers from `fetch`, or a test double with the same `get`. */
export type HeaderLookup = { get(name: string): string | null };

export type TokenLimit = {
  limit: number;
  used: number;
  requested: number;
};

export type RateLimitAction =
  | { type: "retry"; delayMs: number }
  | { type: "shrink"; user: string }
  | { type: "fallback"; model: string }
  | { type: "giveup" };

const MIN_DELAY_MS = 400;
const MAX_DELAY_MS = 20_000;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(n)));
}

function header(headers: HeaderLookup, name: string) {
  return headers.get(name) ?? headers.get(name.toLowerCase());
}

/**
 * OpenAI's reset header is a duration (`150ms`, `6s`, `1m6.5s`), not a number
 * of seconds. A bare number is treated as seconds by the Retry-After parser.
 */
export function parseDurationMs(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const text = raw.trim().toLowerCase();
  if (!text) return null;
  let ms = 0;
  let matched = false;
  const minutes = text.match(/(\d+(?:\.\d+)?)m(?!s)/);
  const seconds = text.match(/(\d+(?:\.\d+)?)s(?![\w])/);
  const millis = text.match(/(\d+(?:\.\d+)?)ms\b/);
  if (minutes) {
    ms += Number(minutes[1]) * 60_000;
    matched = true;
  }
  if (seconds && !millis) {
    ms += Number(seconds[1]) * 1000;
    matched = true;
  }
  if (millis) {
    ms += Number(millis[1]);
    matched = true;
  }
  return matched ? ms : null;
}

function parseRetryAfter(raw: string | null): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/[a-z]/i.test(trimmed)) return parseDurationMs(trimmed);
  const seconds = Number(trimmed);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(trimmed);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return null;
}

function parseBodyDelay(body: string): number | null {
  const match = body.match(/try again in\s+(\d+(?:\.\d+)?)\s*(milliseconds|seconds|ms|s)\b/i);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n) || n < 0) return null;
  const unit = match[2].toLowerCase();
  return unit === "ms" || unit.startsWith("milli") ? n : n * 1000;
}

/** Longest hinted wait. The TPM window is the one that actually unblocks the call. */
export function hintedDelayMs(headers: HeaderLookup, body: string): number | null {
  const values: number[] = [];
  const retryAfterMs = header(headers, "retry-after-ms");
  if (retryAfterMs) {
    const n = Number(retryAfterMs);
    if (Number.isFinite(n) && n >= 0) values.push(n);
  }
  const retryAfter = parseRetryAfter(header(headers, "retry-after"));
  if (retryAfter != null) values.push(retryAfter);
  const reset = parseDurationMs(header(headers, "x-ratelimit-reset-tokens"));
  if (reset != null) values.push(reset);
  const fromBody = parseBodyDelay(body);
  if (fromBody != null) values.push(fromBody);
  if (!values.length) return null;
  return Math.max(...values);
}

export function suggestedDelayMs(headers: HeaderLookup, body: string, attempt: number) {
  const hinted = hintedDelayMs(headers, body);
  // A little past the advertised instant. Retrying on the dot races the window.
  const base = (hinted ?? Math.min(MAX_DELAY_MS, 1_000 * 2 ** Math.max(0, attempt))) + 300;
  return clamp(base, MIN_DELAY_MS, MAX_DELAY_MS);
}

export function readTokenLimit(body: string): TokenLimit | null {
  const limit = Number(body.match(/\bLimit\s+(\d+)/i)?.[1]);
  if (!Number.isFinite(limit) || limit <= 0) return null;
  const used = Number(body.match(/\bUsed\s+(\d+)/i)?.[1]);
  const requested = Number(body.match(/\bRequested\s+(\d+)/i)?.[1]);
  return {
    limit,
    used: Number.isFinite(used) ? used : 0,
    requested: Number.isFinite(requested) ? requested : 0,
  };
}

/**
 * A single call larger than the org's whole TPM cap never succeeds by waiting.
 * Keep both ends: the rubric's best material is usually at the back of a long tape.
 */
export function shrinkPrompt(user: string): string | null {
  if (user.length < 8_000) return null;
  const keep = Math.floor(user.length * 0.3);
  const next = `${user.slice(0, keep)}\n…[middle of the transcript omitted]…\n${user.slice(-keep)}`;
  return next.length < user.length ? next : null;
}

export function nextRateLimitAction(input: {
  headers: HeaderLookup;
  body: string;
  attempt: number;
  shrinks: number;
  user: string;
  fallback: string;
  usedFallback: boolean;
  remainingMs: number;
}): RateLimitAction {
  const info = readTokenLimit(input.body);
  const canFallback = Boolean(input.fallback) && !input.usedFallback && input.remainingMs > 500;
  if (info && info.requested > info.limit) {
    // Waiting does not help: the call is larger than the org's entire minute.
    if (input.shrinks < 2) {
      const shorter = shrinkPrompt(input.user);
      if (shorter) return { type: "shrink", user: shorter };
    }
    if (canFallback) return { type: "fallback", model: input.fallback };
    return { type: "giveup" };
  }

  const delayMs = suggestedDelayMs(input.headers, input.body, input.attempt);
  // The first 429 is usually a burst: the body says exactly how long to wait,
  // and gpt-4o is still the model we want. A second 429 means this minute is
  // already full, so another full transcript will not get through.
  if (input.attempt >= 1 && canFallback) return { type: "fallback", model: input.fallback };
  if (delayMs + 200 <= input.remainingMs && input.attempt < 5) return { type: "retry", delayMs };
  if (canFallback) return { type: "fallback", model: input.fallback };
  return { type: "giveup" };
}

export function summarizeLlmError(body: string) {
  const trimmed = body.trim();
  if (!trimmed) return "request failed";
  try {
    const parsed = JSON.parse(trimmed) as { error?: { message?: unknown } };
    if (typeof parsed.error?.message === "string" && parsed.error.message.trim()) {
      return parsed.error.message.trim().slice(0, 500);
    }
  } catch {
    /* plain text from the provider */
  }
  return trimmed.slice(0, 500);
}

export function isRateLimitMessage(message: string) {
  return /\b429\b|rate limit|tokens per min|\btpm\b/i.test(message);
}

export function isTransientLlmError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return /\b(408|409|429|500|502|503|529)\b|rate limit|tokens per min|\btpm\b|overloaded/i.test(error.message);
}

export function estimateTokens(system: string, user: string, maxTokens: number) {
  return Math.ceil((system.length + user.length) / 4) + maxTokens;
}
