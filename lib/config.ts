export const RUBRIC_VERSION = "v1";

export function env(name: string) {
  return process.env[name]?.trim() || "";
}

export function hasSupabase() {
  return Boolean(env("NEXT_PUBLIC_SUPABASE_URL") && env("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
}

export function llmKey() {
  return env("LLM_API_KEY") || env("OPENAI_API_KEY");
}

export function hasLlm() {
  return Boolean(llmKey());
}

export function hasYouTubeKey() {
  return Boolean(env("YOUTUBE_API_KEY"));
}

export function isDemoMode() {
  return env("CLIPMUSE_MODE").toLowerCase() === "demo";
}

export function exportEnabled() {
  return env("ENABLE_LOCAL_EXPORT").toLowerCase() === "true";
}

export function hasServiceRole() {
  return Boolean(env("SUPABASE_SERVICE_ROLE_KEY") && (env("NEXT_PUBLIC_SUPABASE_URL") || env("SUPABASE_URL")));
}

export function workerUrl() {
  return env("CLIP_WORKER_URL").replace(/\/$/, "");
}

export function workerSecret() {
  return env("CLIP_WORKER_SECRET");
}

export function hasSupadata() {
  return Boolean(env("SUPADATA_API_KEY"));
}

export function hasApify() {
  return Boolean(apifyToken());
}

export function apifyToken() {
  return env("APIFY_TOKEN") || env("APIFY_API_TOKEN");
}

/** YouTube cookies in Netscape format. Only needed for age-restricted videos. */
export function youtubeCookies() {
  return env("YOUTUBE_COOKIES_TEXT");
}

/**
 * Optional proxy for yt-dlp (http, https, or socks5 URL, credentials inline).
 * A residential proxy is what gets a datacenter worker past YouTube's 403s.
 */
export function ytdlpProxy() {
  return env("YTDLP_PROXY");
}

/**
 * Which YouTube clients yt-dlp should try, in order. The default web client is
 * gated behind a PO token / sign-in check ("Sign in to confirm you're not a
 * bot"); tv and web_safari still work unauthenticated.
 */
export function ytdlpPlayerClient() {
  return env("YTDLP_PLAYER_CLIENT") || "tv,web_safari,default";
}

/**
 * Whether to try yt-dlp before Apify. True when the download would come from an
 * IP YouTube tolerates: a residential proxy, or a home machine running the
 * worker without an Apify token.
 */
export function ytdlpFirst() {
  if (env("YTDLP_FIRST").toLowerCase() === "true") return true;
  return Boolean(ytdlpProxy()) || !hasApify();
}

export function llmProvider() {
  return (env("LLM_PROVIDER") || "openai").toLowerCase();
}

export function llmModel() {
  if (env("LLM_MODEL")) return env("LLM_MODEL");
  return llmProvider() === "anthropic" ? "claude-sonnet-4-20250514" : "gpt-4o";
}
