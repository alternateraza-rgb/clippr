import { getSessionUser } from "@/lib/auth/session";
import { hasWhop, whopCompanyId, whopPlanId, whopProductId } from "@/lib/config";
import { siteOrigin } from "@/lib/supabase/origin";
import { inlinePlan, whopClient } from "@/lib/billing/whop";
import { hasAccess, readSubscription } from "@/lib/billing/subscription";
import { describeWhopError } from "@/lib/billing/error";

export const runtime = "nodejs";

/**
 * Mints a Whop checkout link for the signed-in user.
 *
 * The user's id rides along as checkout metadata, which Whop copies onto the
 * payment and the membership. That is the whole mapping: without it a webhook
 * arrives saying somebody paid, with no way to say who.
 */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return Response.json({ message: "Sign in first." }, { status: 401 });

  if (!hasWhop()) {
    return Response.json({ message: "Billing is not configured." }, { status: 503 });
  }

  // Never sell the same person a second subscription.
  const existing = await readSubscription(user.id);
  if (hasAccess(existing)) {
    return Response.json({ alreadySubscribed: true });
  }

  const client = await whopClient();
  if (!client) {
    return Response.json({ message: "Billing is not configured." }, { status: 503 });
  }

  const origin = await siteOrigin();
  const planId = whopPlanId();
  const productId = whopProductId();

  if (!planId && !productId) {
    return Response.json(
      { message: "No plan configured. Set WHOP_PLAN_ID." },
      { status: 503 },
    );
  }

  try {
    const checkout = await client.checkoutConfigurations.create({
      account_id: whopCompanyId(),
      mode: "payment",
      metadata: { user_id: user.id },
      redirect_url: `${origin}/activating`,
      // A plan from the dashboard wins. The inline path needs a product to
      // hang the plan on — Whop rejects a dynamic renewal plan without one.
      ...(planId
        ? { plan_id: planId }
        : { plan: inlinePlan(productId!) }),
    });

    if (!checkout.purchase_url) {
      return Response.json({ message: "Whop returned no checkout URL." }, { status: 502 });
    }

    // Whop returns a path in some responses and an absolute URL in others.
    const url = checkout.purchase_url.startsWith("http")
      ? checkout.purchase_url
      : `https://whop.com${checkout.purchase_url}`;

    return Response.json({ url, checkoutId: checkout.id });
  } catch (error) {
    // Whop's own message, not a generic one: "Could not start checkout" is
    // untraceable, and the API says exactly which field it objected to.
    const described = describeWhopError(error);
    console.error("[billing] checkout failed", described.statusCode, described.message, described.detail);
    return Response.json(
      { message: `Checkout failed: ${described.message}`, statusCode: described.statusCode },
      { status: 502 },
    );
  }
}
