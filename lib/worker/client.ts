import { workerSecret, workerUrl } from "@/lib/config";

export async function wakeWorker() {
  const url = workerUrl();
  if (!url) return { ok: false as const, reason: "not_configured" };
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(90_000) });
    if (!res.ok) return { ok: false as const, reason: `worker_${res.status}` };
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      reason: error instanceof Error ? error.message : "worker_unreachable",
    };
  }
}

export async function requestTranscribe(videoId: string, timeoutMs = 25_000) {
  const url = workerUrl();
  const secret = workerSecret();
  if (!url || !secret) return { ok: false as const, reason: "not_configured" };
  try {
    const res = await fetch(`${url}/transcribe`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ videoId }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return { ok: false as const, reason: `worker_${res.status}` };
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      reason: error instanceof Error ? error.message : "worker_unreachable",
    };
  }
}

export async function requestRefine(
  input: { videoId: string; start: number; end: number },
  timeoutMs = 110_000,
) {
  const url = workerUrl();
  const secret = workerSecret();
  if (!url || !secret) return { ok: false as const, reason: "not_configured" };
  try {
    const res = await fetch(`${url}/refine`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      captionLines?: unknown;
      words?: number;
      reason?: string;
      message?: string;
    };
    if (!res.ok || !data.ok) {
      return {
        ok: false as const,
        reason: data.reason || data.message || `worker_${res.status}`,
      };
    }
    return { ok: true as const, captionLines: data.captionLines, words: data.words };
  } catch (error) {
    return {
      ok: false as const,
      reason: error instanceof Error ? error.message : "worker_unreachable",
    };
  }
}

export async function workerHealth(timeoutMs = 8_000) {
  const url = workerUrl();
  if (!url) return null;
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    return (await res.json()) as {
      ok?: boolean;
      apify?: boolean;
      llm?: boolean;
      ffmpeg?: boolean;
      ytdlp?: string | false;
    };
  } catch {
    return null;
  }
}

export async function pingWorker(renderId: string, timeoutMs = 20_000) {
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
      signal: AbortSignal.timeout(timeoutMs),
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
