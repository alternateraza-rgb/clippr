/**
 * Readable by the client, unlike the Supabase session cookies. It only says
 * "there is a session", never who — enough for the landing page to link a
 * returning user straight at the dashboard instead of routing them through
 * /login and a redirect. Its own module so the client can name it without
 * pulling the proxy's server-only imports into the bundle.
 */
export const SESSION_HINT_COOKIE = "clipmuse-session";
