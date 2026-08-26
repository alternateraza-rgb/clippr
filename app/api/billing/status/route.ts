import { getSessionUser } from "@/lib/auth/session";
import { billingEnforced } from "@/lib/config";
import { hasAccess, readSubscription, NO_SUBSCRIPTION } from "@/lib/billing/subscription";

export const runtime = "nodejs";

/** Polled by the post-checkout page while it waits for the webhook to land. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ enforced: billingEnforced(), access: false, status: "none" });
  }

  const subscription = billingEnforced() ? await readSubscription(user.id) : NO_SUBSCRIPTION;

  return Response.json({
    enforced: billingEnforced(),
    // With billing switched off everyone is in, which is what keeps preview
    // deploys and local development usable.
    access: billingEnforced() ? hasAccess(subscription) : true,
    status: subscription.status,
    currentPeriodEnd: subscription.currentPeriodEnd,
  });
}
