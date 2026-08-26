import { unwrapWebhook } from "@whop/sdk/helpers";
import { whopWebhookSecret } from "@/lib/config";
import {
  claimEvent,
  writeSubscription,
  type SubscriptionStatus,
} from "@/lib/billing/subscription";

export const runtime = "nodejs";

const MEMBERSHIP_STATUSES = new Set<SubscriptionStatus>([
  "trialing",
  "active",
  "past_due",
  "completed",
  "canceled",
  "canceling",
  "expired",
  "unresolved",
  "drafted",
]);

/** The user id we attached at checkout, copied by Whop onto every resource. */
function userIdFrom(resource: unknown): string | null {
  if (!resource || typeof resource !== "object") return null;
  const metadata = (resource as { metadata?: unknown }).metadata;
  if (!metadata || typeof metadata !== "object") return null;
  const value = (metadata as Record<string, unknown>).user_id;
  return typeof value === "string" && value ? value : null;
}

export async function POST(request: Request) {
  const secret = whopWebhookSecret();
  if (!secret) {
    // Refuse rather than accept unverified writes to entitlement state.
    return new Response("Billing webhook is not configured", { status: 503 });
  }

  const payload = await request.text();
  const headers = Object.fromEntries(request.headers);

  let event: { id?: string; type?: string; data?: unknown };
  try {
    event = unwrapWebhook(payload, { headers, key: secret }) as typeof event;
  } catch {
    // A body that does not verify is not from Whop. 400 so it is not retried.
    return new Response("Invalid signature", { status: 400 });
  }

  const type = event.type ?? "";
  const id = event.id ?? "";

  // Claimed before any work: a redelivery must not grant a second period or
  // re-open access that a later event already closed.
  if (id && !(await claimEvent(id, type))) {
    return Response.json({ ok: true, duplicate: true });
  }

  const resource = event.data;
  const userId = userIdFrom(resource);

  if (!userId) {
    // Nothing actionable, but a 2xx: retrying will not make the metadata
    // appear, and a failing endpoint gets disabled by the sender.
    console.warn("[whop] event without user_id metadata", type, id);
    return Response.json({ ok: true, ignored: "no user_id" });
  }

  if (type.startsWith("membership.")) {
    const membership = resource as {
      id?: string;
      status?: string;
      plan_id?: string;
      user_id?: string;
      current_period_end?: string | null;
      cancel_at_period_end?: boolean;
    };

    const raw = membership.status ?? "";
    let status: SubscriptionStatus = MEMBERSHIP_STATUSES.has(raw as SubscriptionStatus)
      ? (raw as SubscriptionStatus)
      : "none";
    // Whop reports a cancelled-but-still-paid membership as active with a flag;
    // flattening that to "active" would lose the end date the UI needs.
    if (status === "active" && membership.cancel_at_period_end) status = "canceling";

    const wrote = await writeSubscription({
      userId,
      status,
      membershipId: membership.id ?? null,
      planId: membership.plan_id ?? null,
      whopUserId: membership.user_id ?? null,
      currentPeriodEnd: membership.current_period_end ?? null,
    });

    if (!wrote) {
      // 500 so Whop retries. Answering 2xx here was how a missing table or an
      // unset SUPABASE_SERVICE_ROLE_KEY turned into a paid customer with no
      // access and nothing in the logs.
      console.error("[whop] could not write subscription", userId, type, status);
      return new Response("Could not record subscription", { status: 500 });
    }

    console.info("[whop] applied", type, userId, status);
    return Response.json({ ok: true, applied: type, status });
  }

  // Payments are logged, not acted on: membership.* is the entitlement signal,
  // and acting on both would let a succeeded payment re-open access that a
  // deactivation had just closed.
  console.info("[whop] observed", type, id);
  return Response.json({ ok: true, observed: type });
}
