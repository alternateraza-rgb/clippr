import { workerSecret, workerUrl } from "@/lib/config";

export async function pingWorker(renderId: string) {
  const url = workerUrl();
  const secret = workerSecret();
  if (!url || !secret) return { ok: false as const, reason: "not_configured" };
  try {
    const res = await fetch(`${url}/render`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ renderId }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      return { ok: false as const, reason: `worker_${res.status}` };
    }
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      reason: error instanceof Error ? error.message : "worker_unreachable",
    };
  }
}
