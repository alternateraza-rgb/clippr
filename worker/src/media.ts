import { mkdir, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { hasApify, ytdlpFirst, ytdlpPlayerClient, ytdlpProxy, youtubeCookies } from "../../lib/config";
import { downloadYoutubeViaApify } from "../../lib/ingest/apify";
import { run } from "./exec";

let ytdlpAvailable: boolean | null = null;

async function hasYtdlp() {
  if (ytdlpAvailable === null) {
    ytdlpAvailable = await run("yt-dlp", ["--version"]).then(
      () => true,
      () => false,
    );
  }
  return ytdlpAvailable;
}

export async function requireDownloader() {
  if (!hasApify() && !(await hasYtdlp())) {
    throw new Error(
      "No way to download. Install yt-dlp on this machine, or set APIFY_TOKEN on the worker.",
    );
  }
}

function youtubeUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/** Second-precision window of the source video a caller actually needs. */
export type SourceRange = { start: number; end: number };

/**
 * Where the downloaded file sits in the original video. `offset` is the
 * timestamp its first frame corresponds to, so callers cut at
 * `wantedStart - offset`. Providers that can only hand back the whole video
 * report 0.
 */
export type DownloadedSource = { offset: number; trimmed: boolean };

function formatArgs(kind: "video" | "audio") {
  if (kind === "audio") return ["-f", "bestaudio/best", "-x", "--audio-format", "m4a"];
  return ["-f", "bv*[height<=720]+ba/b[height<=720]/b", "--merge-output-format", "mp4"];
}

/**
 * Download straight from YouTube. Only worth trying from an IP YouTube does not
 * block — a home machine, or a residential proxy via YTDLP_PROXY. Datacenter
 * IPs get "HTTP Error 403: Forbidden" here, which is what Apify is for.
 */
async function downloadViaYtdlp(
  videoId: string,
  dest: string,
  kind: "video" | "audio",
  range?: SourceRange,
): Promise<DownloadedSource> {
  // Own scratch dir so the "%(ext)s" yt-dlp actually picks does not matter and
  // we never collide with sibling files (subtitles, other clips) in dest's dir.
  const dir = `${dest}.dl`;
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  try {
    const proxy = ytdlpProxy();
    const cookies = youtubeCookies();
    const args = [
      "--no-warnings",
      "--no-playlist",
      "--extractor-args",
      `youtube:player_client=${ytdlpPlayerClient()}`,
      ...formatArgs(kind),
    ];
    // Pulling only the clip window instead of the whole video — the difference
    // between megabytes and gigabytes when YTDLP_PROXY bills per GB.
    const start = range ? Math.max(0, range.start) : 0;
    if (range) {
      args.push("--download-sections", `*${start.toFixed(2)}-${Math.max(start + 1, range.end).toFixed(2)}`);
      // Without this the cut lands on a fragment boundary and the file starts
      // seconds before `start` — measured at ~10s of overshoot on audio — which
      // would make `offset` a lie and sit every caption off its word.
      args.push("--force-keyframes-at-cuts");
    }
    if (proxy) args.push("--proxy", proxy);
    if (cookies) {
      const cookieFile = `${dir}/cookies.txt`;
      await writeFile(cookieFile, cookies.endsWith("\n") ? cookies : `${cookies}\n`);
      args.push("--cookies", cookieFile);
    }
    args.push("-o", `${dir}/src.%(ext)s`, youtubeUrl(videoId));
    await run("yt-dlp", args);
    const file = await pickOutput(dir);
    if (!file) throw new Error("yt-dlp finished but wrote no file");
    await rename(`${dir}/${file}`, dest);
    return { offset: start, trimmed: Boolean(range) };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * The merged output, not a leftover video-only or audio-only fragment — those
 * share the "src." prefix and sort ahead of it often enough to matter.
 */
async function pickOutput(dir: string) {
  const files = (await readdir(dir)).filter((f) => f.startsWith("src.") && !f.includes(".f"));
  if (files.length <= 1) return files[0];
  const sized = await Promise.all(
    files.map(async (f) => ({ f, size: (await stat(`${dir}/${f}`)).size })),
  );
  return sized.sort((a, b) => b.size - a.size)[0].f;
}

function reason(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.split("\n").filter(Boolean).slice(-1)[0]?.slice(0, 300) || "unknown error";
}

/**
 * Fetch a video (or its audio) to `dest`. Pass `range` to download only that
 * window when the provider supports it; check the returned `offset` before
 * cutting, because a fallback provider may have handed back the whole video.
 */
export async function downloadSource(
  videoId: string,
  dest: string,
  kind: "video" | "audio",
  range?: SourceRange,
): Promise<DownloadedSource> {
  await requireDownloader();
  const ytdlp = await hasYtdlp();

  const attempts: Array<[string, () => Promise<DownloadedSource>]> = [];
  const local: [string, () => Promise<DownloadedSource>] = [
    "yt-dlp",
    () => downloadViaYtdlp(videoId, dest, kind, range),
  ];
  const apify: [string, () => Promise<DownloadedSource>] = [
    "Apify",
    async () => {
      // The actor only returns whole videos, so the caller still has to cut.
      const ok = await downloadYoutubeViaApify(videoId, dest, kind);
      if (!ok) throw new Error("no file returned. Check APIFY_TOKEN and actor credits.");
      return { offset: 0, trimmed: false };
    },
  ];
  if (ytdlp && ytdlpFirst()) attempts.push(local);
  if (hasApify()) attempts.push(apify);
  if (ytdlp && !ytdlpFirst()) attempts.push(local);

  const failures: string[] = [];
  for (const [name, attempt] of attempts) {
    try {
      return await attempt();
    } catch (error) {
      failures.push(`${name}: ${reason(error)}`);
    }
  }
  const blocked = failures.some((f) => /403|not a bot|Sign in to confirm/i.test(f));
  const hint = blocked
    ? " YouTube is blocking this IP, not the request — cookies will not fix it." +
      " Set YTDLP_PROXY to a residential proxy, or run the worker from home (docs/LOCAL_WORKER.md)."
    : "";
  throw new Error(`Download failed. ${failures.join(" | ")}.${hint}`);
}

export async function cutReencode(
  src: string,
  dest: string,
  start: number,
  duration: number,
  kind: "video" | "audio",
) {
  if (kind === "audio") {
    await run("ffmpeg", [
      "-y",
      "-ss",
      start.toFixed(2),
      "-i",
      src,
      "-t",
      duration.toFixed(2),
      "-ac",
      "1",
      "-ar",
      "16000",
      "-b:a",
      "64k",
      dest,
    ]);
    return;
  }
  await run("ffmpeg", [
    "-y",
    "-ss",
    start.toFixed(2),
    "-i",
    src,
    "-t",
    duration.toFixed(2),
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    dest,
  ]);
}
