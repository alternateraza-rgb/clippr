import { hasLlm, llmFallbackModel, llmKey, llmModel, llmProvider, llmTpmBudget } from "@/lib/config";
import {
  estimateTokens,
  nextRateLimitAction,
  readTokenLimit,
  suggestedDelayMs,
  summarizeLlmError,
  type HeaderLookup,
} from "@/lib/llm/limits";

export { isRateLimitMessage, isTransientLlmError } from "@/lib/llm/limits";

const EMPTY_HEADERS: HeaderLookup = { get: () => null };

export class LlmStatusError extends Error {
  readonly status: number;
  readonly body: string;
  readonly headers: HeaderLookup;

  constructor(provider: string, status: number, body: string, headers: HeaderLookup) {
    super(`${provider} ${status}: ${summarizeLlmError(body)}`);
    this.name = "LlmStatusError";
    this.status = status;
    this.body = body;
    this.headers = headers;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function providerLabel(provider: string) {
  return provider === "anthropic" ? "Anthropic" : "OpenAI";
}

function retryableStatus(status: number) {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

type Spend = { at: number; tokens: number };

const notBefore = new Map<string, number>();
const budgets = new Map<string, number>();
const ledgers = new Map<string, Spend[]>();

let lastFinishedAt = 0;
let draining = false;

type Queued = {
  patience: number;
  enqueuedAt: number;
  deadline: number;
  run: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
};

const queue: Queued[] = [];

function spent(model: string, now: number) {
  const rows = ledgers.get(model) ?? [];
  const cutoff = now - 60_000;
  const kept = rows.filter((row) => row.at >= cutoff);
  ledgers.set(model, kept);
  return kept.reduce((sum, row) => sum + row.tokens, 0);
}

function windowWait(model: string, now: number) {
  const rows = ledgers.get(model) ?? [];
  if (!rows.length) return 1_000;
  return Math.max(200, rows[0].at + 60_000 - now + 50);
}

function budgetFor(model: string) {
  return budgets.get(model) ?? llmTpmBudget();
}

/**
 * One in-flight chat completion per instance. Parallel transcript scores are
 * what walks a 30k TPM cap: each call is fine alone, and together they are not.
 * Callers that cannot wait (idea preview, discovery) leave the queue instead
 * of sitting behind a score.
 */
function enqueue<T>(patience: number, task: (deadline: number) => Promise<T>): Promise<T> {
  const enqueuedAt = Date.now();
  const deadline = enqueuedAt + patience;
  return new Promise<T>((resolve, reject) => {
    // Preview and discovery must not sit behind a transcript score. They
    // already have a heuristic; stalling them is how a 429 became a frozen sheet.
    if (patience <= 0 && (draining || queue.length > 0)) {
      reject(
        new LlmStatusError(
          providerLabel(llmProvider()),
          429,
          "Rate limit reached for tokens per min (TPM). Please try again in a few seconds.",
          EMPTY_HEADERS,
        ),
      );
      return;
    }
    queue.push({
      patience,
      enqueuedAt,
      deadline,
      run: () => task(deadline),
      resolve: resolve as (value: unknown) => void,
      reject,
    });
    pump();
  });
}

function pump() {
  if (draining) return;
  const job = queue.shift();
  if (!job) return;
  if (job.patience <= 0 && job.enqueuedAt < lastFinishedAt) {
    job.reject(
      new LlmStatusError(
        providerLabel(llmProvider()),
        429,
        "Rate limit reached for tokens per min (TPM). Please try again in a few seconds.",
        EMPTY_HEADERS,
      ),
    );
    pump();
    return;
  }
  draining = true;
  job.run().then(job.resolve, job.reject).finally(() => {
    draining = false;
    lastFinishedAt = Date.now();
    pump();
  });
}

async function pace(provider: string, model: string, estimate: number, deadline: number) {
  const budget = budgetFor(model);
  // Bigger than the whole cap: waiting cannot help. The 429 handler shrinks it.
  if (estimate >= budget) return;
  for (;;) {
    const now = Date.now();
    const hold = (notBefore.get(model) ?? 0) - now;
    const used = spent(model, now);
    const over = used + estimate > budget;
    if (hold <= 0 && !over) return;
    const wait = Math.max(hold, over ? windowWait(model, now) : 0);
    if (wait <= 0) return;
    if (now + wait > deadline) {
      throw new LlmStatusError(
        providerLabel(provider),
        429,
        "Rate limit reached for tokens per min (TPM). Please try again in a few seconds.",
        EMPTY_HEADERS,
      );
    }
    await sleep(Math.min(wait, deadline - now));
  }
}

function recordSpend(model: string, tokens: number) {
  const rows = ledgers.get(model) ?? [];
  rows.push({ at: Date.now(), tokens: Math.max(1, tokens) });
  ledgers.set(model, rows);
}

async function postProvider(input: {
  provider: string;
  model: string;
  key: string;
  system: string;
  user: string;
  maxTokens: number;
}) {
  if (input.provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": input.key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: input.model,
        max_tokens: input.maxTokens,
        system: `${input.system}\nRespond with JSON only.`,
        messages: [{ role: "user", content: input.user }],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new LlmStatusError("Anthropic", res.status, body, res.headers);
    }
    const data = (await res.json()) as {
      content?: Array<{ text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = data.content?.map((c) => c.text ?? "").join("") ?? "";
    return {
      text: extractJson(text),
      tokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
      model: input.model,
    };
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${input.key}`,
    },
    body: JSON.stringify({
      model: input.model,
      temperature: 0.3,
      max_tokens: input.maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${input.system}\nRespond with JSON.` },
        { role: "user", content: input.user },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new LlmStatusError("OpenAI", res.status, body, res.headers);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { total_tokens?: number };
  };
  return {
    text: extractJson(data.choices?.[0]?.message?.content ?? "{}"),
    tokens: data.usage?.total_tokens ?? 0,
    model: input.model,
  };
}

async function execute(
  input: { system: string; user: string; maxTokens: number },
  deadline: number,
) {
  const provider = llmProvider();
  const key = llmKey();
  let model = llmModel();
  let user = input.user;
  let attempt = 0;
  let shrinks = 0;
  let usedFallback = false;
  let lastLimit: LlmStatusError | null = null;
  const fallback = llmFallbackModel(model);

  for (;;) {
    const estimate = estimateTokens(input.system, user, input.maxTokens);
    await pace(provider, model, estimate, deadline);
    try {
      const result = await postProvider({
        provider,
        model,
        key,
        system: input.system,
        user,
        maxTokens: input.maxTokens,
      });
      recordSpend(model, result.tokens || estimate);
      return result;
    } catch (error) {
      // A missing fallback model should not replace the rate-limit error the
      // user can act on with "the reply could not be turned into clips".
      if (error instanceof LlmStatusError && usedFallback && error.status === 404 && lastLimit) {
        throw lastLimit;
      }
      if (!(error instanceof LlmStatusError) || !retryableStatus(error.status)) throw error;

      if (error.status !== 429) {
        const delay = Math.min(8_000, 700 * 2 ** attempt);
        if (attempt < 2 && Date.now() + delay <= deadline) {
          console.warn(`[llm] ${providerLabel(provider)} ${error.status} on ${model}, retrying in ${delay}ms`);
          await sleep(delay);
          attempt += 1;
          continue;
        }
        throw error;
      }

      lastLimit = error;
      const info = readTokenLimit(error.body);
      if (info?.limit) budgets.set(model, Math.max(1_000, Math.floor(info.limit * 0.85)));

      const action = nextRateLimitAction({
        headers: error.headers,
        body: error.body,
        attempt,
        shrinks,
        user,
        fallback,
        usedFallback,
        remainingMs: deadline - Date.now(),
      });

      if (action.type === "shrink") {
        user = action.user;
        shrinks += 1;
        console.warn(`[llm] ${model} request is larger than the TPM cap; shortening the prompt`);
        continue;
      }

      const delay =
        action.type === "retry" ? action.delayMs : suggestedDelayMs(error.headers, error.body, attempt);
      notBefore.set(model, Math.max(notBefore.get(model) ?? 0, Date.now() + delay));

      if (action.type === "retry") {
        const jitter = Math.floor(Math.random() * 400);
        console.warn(`[llm] ${model} rate limited, retrying in ${delay + jitter}ms`);
        await sleep(delay + jitter);
        attempt += 1;
        continue;
      }
      if (action.type === "fallback") {
        console.warn(`[llm] ${model} still rate limited; falling back to ${action.model}`);
        model = action.model;
        usedFallback = true;
        attempt += 1;
        continue;
      }
      throw error;
    }
  }
}

export async function completeJson(input: {
  system: string;
  user: string;
  maxTokens?: number;
  /**
   * How long a caller may sit on a 429. Scoring passes a budget so a full
   * minute of tokens can clear. Previews leave it at 0 and keep the heuristic.
   */
  rateLimitWaitMs?: number;
}): Promise<{ text: string; tokens: number; model: string }> {
  if (!hasLlm()) throw new Error("LLM_API_KEY missing");
  const patience = Math.max(0, input.rateLimitWaitMs ?? 0);
  return enqueue(patience, (deadline) =>
    execute(
      {
        system: input.system,
        user: input.user,
        maxTokens: input.maxTokens ?? 1600,
      },
      deadline,
    ),
  );
}

export function extractJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) return "{}";
  return text.slice(start, end + 1);
}
