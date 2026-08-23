import { writeFile } from "node:fs/promises";
import { youtubeCookies, ytdlpPlayerClient, ytdlpProxy } from "@/lib/config";

/**
 * Substitutes a fresh id into a `{session}` placeholder in YTDLP_PROXY.
 *
 * Rotating gateways hand out a new IP per request, which breaks a download
 * mid-flight — YouTube ties media URLs to the IP that requested them, so the
 * fragments 403. A session id pins one IP for the whole download. Generating a
 * new one per call is also what lets a retry land on a different IP.
 *
 * DataImpulse spells it `login__cr.us;sessid.{session}:pass@gw…:823`; other
 * providers use their own parameter, hence the generic placeholder.
 */
export function resolveProxy() {
  const proxy = ytdlpProxy();
  if (!proxy.includes("{session}")) return proxy;
  return proxy.replaceAll("{session}", Math.random().toString(36).slice(2, 10));
}

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
  const proxy = resolveProxy();
  if (proxy) {
    args.push("--proxy", proxy);
    // Residential peers stall and die. Let yt-dlp itself ride out the small
    // failures before we throw the whole attempt away and pay for a new one.
    args.push(
      "--socket-timeout",
      "30",
      "--retries",
      "10",
      "--fragment-retries",
      "10",
      "--extractor-retries",
      "5",
    );
  }
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

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Whether a failure is YouTube refusing the IP rather than something about the
 * video. Only worth retrying behind a rotating proxy, where the next attempt
 * comes from somewhere else.
 */
export function isBlockError(error: unknown) {
  return /403|Forbidden|not a bot|Sign in to confirm/i.test(messageOf(error));
}

/**
 * Whether the connection itself died rather than being refused. Residential
 * exit nodes are other people's devices: they drop mid-handshake, go offline,
 * and time out constantly. Always worth another attempt — a rotating pool
 * hands the retry a different peer, and even without a proxy these are
 * transient by nature.
 */
export function isTransientError(error: unknown) {
  return /TLS\/SSL|SSLError|EOF|reset by peer|Connection reset|Remote end closed|timed out|Read timed out|Connection aborted|Broken pipe|502|503|NO_HOST_CONNECTION|NO_RAY/i.test(
    messageOf(error),
  );
}
