import { whopApiKey } from "@/lib/config";

export const PLAN_PRICE_USD = 150;
export const PLAN_BILLING_PERIOD_DAYS = 30;
export const PLAN_TITLE = "Clipmuse — Unlimited";

/**
 * The plan sold when there is no dashboard plan to point at.
 *
 * `initial_price` is a joining fee charged *on top of* the first renewal, not
 * the price of the first period — setting both to 150 billed $300 on day one.
 * This is a flat monthly subscription with nothing to join, so it is zero.
 *
 * Defined here and nowhere else: the diagnostic script used to carry its own
 * copy of these numbers, which is how a wrong price survives being fixed.
 */
export function inlinePlan(productId: string) {
  return {
    product_id: productId,
    currency: "usd",
    plan_type: "renewal",
    initial_price: 0,
    renewal_price: PLAN_PRICE_USD,
    billing_period: PLAN_BILLING_PERIOD_DAYS,
    title: PLAN_TITLE,
    visibility: "hidden",
  } as const;
}

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
