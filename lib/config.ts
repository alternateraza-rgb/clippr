// v2: story assembly. Bumping this invalidates every cached single-window
// analysis, which would otherwise come back with no segments.
export const RUBRIC_VERSION = "v2";

/**
 * Values that mean "not actually configured" even though something is there.
 * `vercel env pull` writes the literal "[SENSITIVE]" for variables marked
 * Sensitive, and .env.local templates use PASTE_. Both sail through every
 * hasX() check and then fail at the first real call, which reads as a broken
 * worker rather than a missing secret.
 */
function isPlaceholder(value: string) {
  return value === "[SENSITIVE]" || value.startsWith("PASTE_");
}

export function env(name: string) {
  const value = process.env[name]?.trim() || "";
  return isPlaceholder(value) ? "" : value;
}

export function hasSupabase() {
  return Boolean(env("NEXT_PUBLIC_SUPABASE_URL") && env("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
}

/**
 * Whop is the merchant of record for the $150/month plan. Everything billing
 * is optional: with no keys the app runs exactly as it did before, which is
 * what keeps local development and preview deploys usable.
 */
export function whopApiKey() {
  return env("WHOP_API_KEY");
}

export function whopCompanyId() {
  return env("WHOP_COMPANY_ID");
}

export function whopWebhookSecret() {
  return env("WHOP_WEBHOOK_SECRET");
}

/** The plan being sold. Whop rejects an inline renewal plan with no product. */
export function whopPlanId() {
  return env("WHOP_PLAN_ID");
}

/** Alternative to WHOP_PLAN_ID: build the plan per checkout under this product. */
export function whopProductId() {
  return env("WHOP_PRODUCT_ID");
}

/**
 * Billing needs something to sell. Without a plan or a product the checkout
 * call fails at Whop, so this returns false and the gate stays open — an app
 * that is free by accident beats one where nobody can pay and everybody is
 * locked out.
 */
export function hasWhop() {
  return Boolean(whopApiKey() && whopCompanyId() && (whopPlanId() || whopProductId()));
}

/** Gate the app on payment. Off by default so nothing locks out by accident. */
export function billingEnforced() {
  return hasWhop() && env("BILLING_ENFORCED").toLowerCase() !== "false";
}

/**
 * Cloudflare R2, for finished clips. S3-compatible with no egress charge,
 * which is the entire reason to move video off Supabase Storage: delivering a
 * clip is pure egress and every download was billed.
 *
 * Optional. With no keys the app reads and writes Supabase exactly as before.
 */
export function r2AccountId() {
  return env("R2_ACCOUNT_ID");
}

export function r2AccessKeyId() {
  return env("R2_ACCESS_KEY_ID");
}

export function r2SecretAccessKey() {
  return env("R2_SECRET_ACCESS_KEY");
}

export function r2Bucket() {
  return env("R2_BUCKET");
}

export function hasR2() {
  return Boolean(r2AccountId() && r2AccessKeyId() && r2SecretAccessKey() && r2Bucket());
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
