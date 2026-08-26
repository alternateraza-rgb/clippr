import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Whop's vocabulary, stored as-is. */
export type SubscriptionStatus =
  | "none"
  | "trialing"
  | "active"
  | "past_due"
  | "completed"
  | "canceled"
  | "canceling"
  | "expired"
  | "unresolved"
  | "drafted";

export type Subscription = {
  status: SubscriptionStatus;
  membershipId: string | null;
  planId: string | null;
  currentPeriodEnd: string | null;
};

export const NO_SUBSCRIPTION: Subscription = {
  status: "none",
  membershipId: null,
  planId: null,
  currentPeriodEnd: null,
};

/**
 * Whether this subscription buys access right now.
 *
 * `canceling` still does: they cancelled but paid through the end of the
 * period, and the refund policy promises exactly that. `past_due` does too
 * while the period they already paid for has not run out — locking someone out
 * the instant a card retry fails punishes them for their bank's timing.
 */
export function hasAccess(subscription: Subscription): boolean {
  const { status, currentPeriodEnd } = subscription;
  if (status === "active" || status === "trialing") return true;
  if (status === "canceling" || status === "past_due") {
    if (!currentPeriodEnd) return status === "canceling";
    return new Date(currentPeriodEnd).getTime() > Date.now();
  }
  return false;
}

function fromRow(row: {
  status?: string | null;
  whop_membership_id?: string | null;
  whop_plan_id?: string | null;
  current_period_end?: string | null;
}): Subscription {
  return {
    status: (row.status as SubscriptionStatus) ?? "none",
    membershipId: row.whop_membership_id ?? null,
    planId: row.whop_plan_id ?? null,
    currentPeriodEnd: row.current_period_end ?? null,
  };
}

/** Reads the local mirror. Never calls Whop — this sits on the request path. */
export async function readSubscription(userId: string): Promise<Subscription> {
  const supabase = createAdminClient() ?? (await createClient());
  if (!supabase) return NO_SUBSCRIPTION;
  const { data } = await supabase
    .from("subscriptions")
    .select("status, whop_membership_id, whop_plan_id, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();
  return data ? fromRow(data) : NO_SUBSCRIPTION;
}

/** Applied from a verified webhook only. */
export async function writeSubscription(input: {
  userId: string;
  status: SubscriptionStatus;
  membershipId?: string | null;
  planId?: string | null;
  whopUserId?: string | null;
  currentPeriodEnd?: string | null;
}): Promise<boolean> {
  const supabase = createAdminClient();
  // Deliberately admin-only: the RLS policy grants users SELECT and nothing
  // else, so a request-scoped client could not write this even if it tried.
  if (!supabase) return false;
  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: input.userId,
      status: input.status,
      whop_membership_id: input.membershipId ?? null,
      whop_plan_id: input.planId ?? null,
      whop_user_id: input.whopUserId ?? null,
      current_period_end: input.currentPeriodEnd ?? null,
    },
    { onConflict: "user_id" },
  );
  return !error;
}

/**
 * Webhook de-duplication. Standard Webhooks redelivers on any non-2xx, so a
 * slow handler that eventually succeeded can be replayed.
 */
export async function claimEvent(id: string, type: string): Promise<boolean> {
  const supabase = createAdminClient();
  if (!supabase) return true;
  const { error } = await supabase.from("whop_events").insert({ id, type });
  // A primary-key conflict means this one has already been applied.
  return !error;
}
