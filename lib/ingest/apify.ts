import { writeFile } from "node:fs/promises";
import { apifyToken, hasApify, youtubeCookies } from "@/lib/config";

const ACTOR = "datapipe~youtube-video-downloader";

function youtubeUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function withToken(url: string, token: string) {
  if (!url.includes("api.apify.com")) return url;
  const u = new URL(url);
  if (!u.searchParams.get("token")) u.searchParams.set("token", token);
  return u.toString();
}

async function waitForRun(runId: string, token: string, timeoutMs = 240_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${encodeURIComponent(token)}`, {
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await res.json()) as { data?: { status?: string; defaultDatasetId?: string } };
    const status = json.data?.status;
    if (status === "SUCCEEDED") return json.data;
    if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
      throw new Error(`Apify run ${status}`);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("Apify run timed out");
}

export async function downloadYoutubeViaApify(
  videoId: string,
  dest: string,
  kind: "video" | "audio" = "video",
): Promise<boolean> {
  if (!hasApify()) return false;
  const token = apifyToken();
  const cookiesText = youtubeCookies();
  const input = {
    ...(kind === "audio"
      ? { videoUrls: [youtubeUrl(videoId)], format: "m4a" }
      : { videoUrls: [youtubeUrl(videoId)], quality: "720p", format: "mp4" }),
    // Optional per the actor's input schema, and only for age-restricted
    // videos — plain 403s are IP blocks, which cookies do not fix. See
    // YTDLP_PROXY in .env.example for those.
    ...(cookiesText ? { cookiesText } : {}),
  };
  const start = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR}/runs?token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!start.ok) throw new Error(`Apify start ${start.status}`);
  const started = (await start.json()) as { data?: { id?: string } };
  const runId = started.data?.id;
  if (!runId) throw new Error("Apify did not return a run id");
  const run = await waitForRun(runId, token);
  const datasetId = run?.defaultDatasetId;
  if (!datasetId) throw new Error("Apify run had no dataset");
  const itemsRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${encodeURIComponent(token)}`,
    { signal: AbortSignal.timeout(20_000) },
  );
  const items = (await itemsRes.json()) as Array<{
    status?: string;
    downloadUrl?: string;
    error?: string;
    errorType?: string;
  }>;
  const url = items.find((i) => i.downloadUrl)?.downloadUrl;
  if (!url) {
    if (!items.length) throw new Error("Apify returned no dataset items for this video");
    const failed = items.find((i) => i.status === "failed") ?? items[0];
    const reason = failed.error || failed.errorType || failed.status || "unknown reason";
    throw new Error(`Apify could not download this video: ${reason}`);
  }
  const file = await fetch(withToken(url, token), { signal: AbortSignal.timeout(180_000) });
  if (!file.ok) throw new Error(`Apify file ${file.status}`);
  await writeFile(dest, Buffer.from(await file.arrayBuffer()));
  return true;
}
