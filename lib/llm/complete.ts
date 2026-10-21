import { hasLlm, llmKey, llmModel, llmProvider } from "@/lib/config";

export async function completeJson(input: {
  system: string;
  user: string;
  maxTokens?: number;
  /**
   * A JSON Schema for the answer. OpenAI enforces it; every other provider
   * falls back to being asked nicely, so callers must still validate.
   */
  schema?: { name: string; schema: Record<string, unknown> };
  /** 0 for verbatim work. Defaults to a little warmth for everything else. */
  temperature?: number;
}): Promise<{ text: string; tokens: number; model: string }> {
  if (!hasLlm()) throw new Error("LLM_API_KEY missing");
  const provider = llmProvider();
  const model = llmModel();
  const key = llmKey();
  // Six segments, each with two verbatim quotes, plus the topic, the reason and
  // five scores does not fit in 1600 — the answer came back cut off mid-string,
  // failed to parse, and burned a retry on a "bad shape" message that described
  // nothing that was wrong.
  const maxTokens = input.maxTokens ?? 3000;
  const temperature = input.temperature ?? 0.3;

  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: `${input.system}\nRespond with JSON only.`,
        messages: [{ role: "user", content: input.user }],
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Anthropic ${res.status}${detail ? `: ${detail.slice(0, 180)}` : ""}`);
    }
    const data = (await res.json()) as {
      content?: Array<{ text?: string }>;
      stop_reason?: string;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    if (data.stop_reason === "max_tokens") {
      throw new Error(
        "your answer was cut off before it finished — return fewer segments, or a much shorter whyItClips",
      );
    }
    const text = data.content?.map((c) => c.text ?? "").join("") ?? "";
    return {
      text: extractJson(text),
      tokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
      model,
    };
  }

  // A schema, not just "make it JSON". Under json_object a missing endQuote was
  // still valid JSON, so the answer parsed, the segment quietly lost its closing
  // anchor, and the cut fell back to the clock. strict mode makes that a refusal
  // instead of a bad clip.
  const ask = (format: Record<string, unknown>) =>
    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        response_format: format,
        messages: [
          { role: "system", content: `${input.system}\nRespond with JSON.` },
          { role: "user", content: input.user },
        ],
      }),
    });

  const wanted = input.schema
    ? { type: "json_schema", json_schema: { ...input.schema, strict: true } }
    : { type: "json_object" };
  let res = await ask(wanted);

  // Structured outputs need a model snapshot that supports them, and `gpt-4o`
  // is an alias that has pointed at older ones. Degrade to plain JSON mode
  // rather than failing analysis outright — a schema is an improvement, not a
  // dependency, and every caller still validates what comes back.
  if (!res.ok && res.status === 400 && input.schema) {
    const detail = await res.text().catch(() => "");
    if (/json_schema|response_format|structured/i.test(detail)) {
      console.warn(`[llm] ${model} rejected json_schema, falling back to json_object`);
      res = await ask({ type: "json_object" });
    } else {
      throw new Error(`OpenAI 400: ${detail.slice(0, 180)}`);
    }
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}${detail ? `: ${detail.slice(0, 180)}` : ""}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
    usage?: { total_tokens?: number };
  };
  // Say what actually happened. A truncated answer reported as "bad shape"
  // sends the model a correction it cannot act on.
  if (data.choices?.[0]?.finish_reason === "length") {
    throw new Error(
      "your answer was cut off before it finished — return fewer segments, or a much shorter whyItClips",
    );
  }
  return {
    text: extractJson(data.choices?.[0]?.message?.content ?? "{}"),
    tokens: data.usage?.total_tokens ?? 0,
    model,
  };
}

export function extractJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) return "{}";
  return text.slice(start, end + 1);
}
