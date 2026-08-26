"use client";

import { useSyncExternalStore } from "react";
import { SESSION_HINT_COOKIE } from "@/lib/supabase/session-hint";

function read() {
  return document.cookie
    .split("; ")
    .some((c) => c === `${SESSION_HINT_COOKIE}=1`);
}

/** Cookies don't emit change events; the proxy rewrites this one per request. */
function subscribe() {
  return () => {};
}

/**
 * Whether the proxy saw a session on the last request. A hint, not an
 * authorisation — every protected route is still gated server-side. Static
 * pages render the signed-out branch and swap on hydration.
 */
export function useSessionHint() {
  return useSyncExternalStore(
    subscribe,
    read,
    () => false,
  );
}
