import { mkdir, readdir, rename, rm, writeFile } from "node:fs/promises";
import { hasApify, ytdlpFirst, ytdlpProxy, youtubeCookies } from "../../lib/config";
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

function formatArgs(kind: "video" | "audio") {
  if (kind === "audio") return ["-f", "bestaudio/best", "-x", "--audio-format", "m4a"];
  return ["-f", "bv*[height<=720]+ba/b[height<=720]/b", "--merge-output-format", "mp4"];
}

/**
 * Download straight from YouTube. Only worth trying from an IP YouTube does not
 * block — a home machine, or a residential proxy via YTDLP_PROXY. Datacenter
 * IPs get "HTTP Error 403: Forbidden" here, which is what Apify is for.
 */
async function downloadViaYtdlp(videoId: string, dest: string, kind: "video" | "audio") {
  // Own scratch dir so the "%(ext)s" yt-dlp actually picks does not matter and
  // we never collide with sibling files (subtitles, other clips) in dest's dir.
  const dir = `${dest}.dl`;
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  try {
    const proxy = ytdlpProxy();
    const cookies = youtubeCookies();
    const args = ["--no-warnings", "--no-playlist", ...formatArgs(kind)];
    if (proxy) args.push("--proxy", proxy);
    if (cookies) {
      const cookieFile = `${dir}/cookies.txt`;
      await writeFile(cookieFile, cookies.endsWith("\n") ? cookies : `${cookies}\n`);
      args.push("--cookies", cookieFile);
    }
    args.push("-o", `${dir}/src.%(ext)s`, youtubeUrl(videoId));
    await run("yt-dlp", args);
    const file = (await readdir(dir)).find((f) => f.startsWith("src."));
    if (!file) throw new Error("yt-dlp finished but wrote no file");
    await rename(`${dir}/${file}`, dest);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function reason(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.split("\n").filter(Boolean).slice(-1)[0]?.slice(0, 300) || "unknown error";
}

export async function downloadSource(videoId: string, dest: string, kind: "video" | "audio") {
  await requireDownloader();
  const ytdlp = await hasYtdlp();

  const attempts: Array<[string, () => Promise<unknown>]> = [];
  const local: [string, () => Promise<unknown>] = [
    "yt-dlp",
    () => downloadViaYtdlp(videoId, dest, kind),
  ];
  const apify: [string, () => Promise<unknown>] = [
    "Apify",
    async () => {
      const ok = await downloadYoutubeViaApify(videoId, dest, kind);
      if (!ok) throw new Error("no file returned. Check APIFY_TOKEN and actor credits.");
    },
  ];
  if (ytdlp && ytdlpFirst()) attempts.push(local);
  if (hasApify()) attempts.push(apify);
  if (ytdlp && !ytdlpFirst()) attempts.push(local);

  const failures: string[] = [];
  for (const [name, attempt] of attempts) {
    try {
      await attempt();
      return;
    } catch (error) {
      failures.push(`${name}: ${reason(error)}`);
    }
  }
  throw new Error(`Download failed. ${failures.join(" | ")}`);
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
