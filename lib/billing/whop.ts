import { whopApiKey } from "@/lib/config";

export const PLAN_PRICE_USD = 150;
export const PLAN_BILLING_PERIOD_DAYS = 30;
export const PLAN_TITLE = "Clipmuse — Unlimited";

/**
 * Null when Whop is not configured, so every caller degrades instead of
 * throwing. Imported lazily: the SDK should not be pulled into a bundle that
 * is never going to have a key to use it with.
 */
export async function whopClient() {
  const key = whopApiKey();
  if (!key) return null;
  const { WhopClient } = await import("@whop/sdk");
  return new WhopClient({ token: key });
}
