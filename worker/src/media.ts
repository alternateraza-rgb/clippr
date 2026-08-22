import { hasApify } from "../../lib/config";
import { downloadYoutubeViaApify } from "../../lib/ingest/apify";
import { run } from "./exec";

export function requireApify() {
  if (!hasApify()) {
    throw new Error("Set APIFY_TOKEN on the Render worker so downloads do not hit YouTube.");
  }
}

export async function downloadSource(videoId: string, dest: string, kind: "video" | "audio") {
  requireApify();
  const ok = await downloadYoutubeViaApify(videoId, dest, kind);
  if (!ok) throw new Error("Apify returned no file. Check APIFY_TOKEN and actor credits.");
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
