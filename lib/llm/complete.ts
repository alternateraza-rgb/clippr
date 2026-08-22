import { hasLlm, llmKey, llmModel, llmProvider } from "@/lib/config";

export async function completeJson(input: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<{ text: string; tokens: number; model: string }> {
  if (!hasLlm()) throw new Error("LLM_API_KEY missing");
  const provider = llmProvider();
  const model = llmModel();
  const key = llmKey();
  const maxTokens = input.maxTokens ?? 1600;

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
    if (!res.ok) throw new Error(`Anthropic ${res.status}`);
    const data = (await res.json()) as {
      content?: Array<{ text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = data.content?.map((c) => c.text ?? "").join("") ?? "";
    return {
      text: extractJson(text),
      tokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
      model,
    };
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${input.system}\nRespond with JSON.` },
        { role: "user", content: input.user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { total_tokens?: number };
  };
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
