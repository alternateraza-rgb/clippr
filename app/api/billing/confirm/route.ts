import { getSessionUser } from "@/lib/auth/session";
import { hasWhop } from "@/lib/config";
import { whopClient } from "@/lib/billing/whop";
import { describeWhopError } from "@/lib/billing/error";
import {
  hasAccess,
  readSubscription,
  writeSubscription,
  type SubscriptionStatus,
} from "@/lib/billing/subscription";

export const runtime = "nodejs";

const GRANTS: SubscriptionStatus[] = ["active", "trialing", "canceling", "past_due"];

/**
 * Confirms a purchase straight from the redirect, without waiting for a
 * webhook.
 *
 * The webhook is still the source of truth for the whole lifecycle — renewals,
 * cancellations, failed cards. But a webhook that is misconfigured, delayed or
 * rejected leaves someone who has genuinely paid staring at a spinner, and the
 * redirect Whop sends them back with names the payment. Asking Whop about that
 * payment directly turns a stuck checkout into a self-healing one.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ message: "Sign in first." }, { status: 401 });
  if (!hasWhop()) return Response.json({ access: true, reason: "billing-off" });

  // Already sorted, probably by the webhook arriving while they read the page.
  const existing = await readSubscription(user.id);
  if (hasAccess(existing)) return Response.json({ access: true, reason: "already-active" });

  const body = (await request.json().catch(() => ({}))) as { paymentId?: string };
  const paymentId = String(body.paymentId ?? "").slice(0, 64);
  if (!paymentId) return Response.json({ access: false, reason: "no-payment-id" });

  const client = await whopClient();
  if (!client) return Response.json({ access: false, reason: "no-client" });

  try {
    const payment = await client.payments.retrieve({ id: paymentId });

    // The payment must belong to whoever is asking. Without this check anyone
    // could paste someone else's payment id and be handed a subscription.
    const owner = (payment.metadata ?? {}).user_id;
    if (typeof owner !== "string" || owner !== user.id) {
      console.warn("[billing] confirm rejected: payment is not this user's", paymentId);
      return Response.json({ access: false, reason: "not-yours" }, { status: 403 });
    }

    if (payment.status !== "paid") {
      return Response.json({ access: false, reason: `payment-${payment.status}` });
    }

    const membership = payment.membership;
    const status = (membership?.status ?? "active") as SubscriptionStatus;
    if (!GRANTS.includes(status)) {
      return Response.json({ access: false, reason: `membership-${status}` });
    }

    const wrote = await writeSubscription({
      userId: user.id,
      status,
      membershipId: membership?.id ?? null,
    });
    if (!wrote) {
      console.error("[billing] confirm could not write subscription", user.id);
      return Response.json({ access: false, reason: "write-failed" }, { status: 500 });
    }

    console.info("[billing] confirmed from redirect", user.id, paymentId, status);
    return Response.json({ access: true, reason: "confirmed" });
  } catch (error) {
    const described = describeWhopError(error);
    console.error("[billing] confirm failed", described.statusCode, described.message);
    return Response.json({ access: false, reason: "lookup-failed" }, { status: 502 });
  }
}
