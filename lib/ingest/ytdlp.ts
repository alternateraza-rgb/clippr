import { writeFile } from "node:fs/promises";
import { youtubeCookies, ytdlpPlayerClient, ytdlpProxy } from "@/lib/config";

/**
 * Every yt-dlp invocation goes through here. Kept in one place because the
 * pieces that get forgotten — the proxy above all — are the difference between
 * working and a blanket "Sign in to confirm you're not a bot".
 */
export function ytdlpBaseArgs() {
  const args = [
    "--no-warnings",
    "--extractor-args",
    `youtube:player_client=${ytdlpPlayerClient()}`,
  ];
  const proxy = ytdlpProxy();
  if (proxy) args.push("--proxy", proxy);
  return args;
}

/**
 * Writes YOUTUBE_COOKIES_TEXT into `dir` and returns the args pointing at it.
 * Empty when no cookies are configured, which is the normal case — cookies are
 * only for age-restricted videos.
 */
export async function cookieArgs(dir: string) {
  const cookies = youtubeCookies();
  if (!cookies) return [];
  const file = `${dir}/cookies.txt`;
  await writeFile(file, cookies.endsWith("\n") ? cookies : `${cookies}\n`);
  return ["--cookies", file];
}

/**
 * Whether a failure is YouTube refusing the IP rather than something about the
 * video. Worth retrying on a rotating proxy; nothing else here is.
 */
export function isBlockError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /403|Forbidden|not a bot|Sign in to confirm/i.test(message);
}
