export const RUBRIC_VERSION = "v1";

export function env(name: string) {
  return process.env[name]?.trim() || "";
}

export function hasSupabase() {
  return Boolean(env("NEXT_PUBLIC_SUPABASE_URL") && env("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
}

export function hasLlm() {
  return Boolean(env("LLM_API_KEY"));
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

export function llmProvider() {
  return (env("LLM_PROVIDER") || "openai").toLowerCase();
}

export function llmModel() {
  if (env("LLM_MODEL")) return env("LLM_MODEL");
  return llmProvider() === "anthropic" ? "claude-sonnet-4-20250514" : "gpt-4o-mini";
}
