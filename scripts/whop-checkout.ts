import "../lib/load-env";
import { WhopClient } from "@whop/sdk";
import { describeWhopError } from "../lib/billing/error";

/**
 * Creates a throwaway checkout with the same arguments the app uses, and
 * prints whatever Whop says. Faster than a deploy-and-click loop, and it shows
 * the field-level error the API returns rather than a generic failure.
 */
async function main() {
  const token = process.env.WHOP_API_KEY;
  const accountId = process.env.WHOP_COMPANY_ID;
  const planId = process.env.WHOP_PLAN_ID;
  const productId = process.env.WHOP_PRODUCT_ID;

  if (!token) {
    console.error("[whop] WHOP_API_KEY missing — add it to .env.local");
    process.exit(1);
  }
  console.log("[whop] account:", accountId || "(none set)");
  console.log("[whop] plan:", planId || "(none)");
  console.log("[whop] product:", productId || "(none)");

  if (!planId && !productId) {
    console.error("[whop] Set WHOP_PLAN_ID (or WHOP_PRODUCT_ID). Whop rejects an inline renewal plan with no product.");
    process.exit(1);
  }

  const client = new WhopClient({ token });

  try {
    const checkout = await client.checkoutConfigurations.create({
      account_id: accountId,
      mode: "payment",
      metadata: { user_id: "diagnostic" },
      redirect_url: "https://clipmuse.online/activating",
      ...(planId
        ? { plan_id: planId }
        : {
            plan: {
              product_id: productId,
              currency: "usd",
              plan_type: "renewal",
              initial_price: 150,
              renewal_price: 150,
              billing_period: 30,
              title: "Clipmuse — Unlimited",
              visibility: "hidden",
            },
          }),
    });
    console.log("[whop] OK");
    console.log("       id:", checkout.id);
    console.log("       purchase_url:", checkout.purchase_url);
  } catch (error) {
    const described = describeWhopError(error);
    console.error("[whop] FAILED", described.statusCode ?? "");
    console.error("       ", described.message);
    console.error("        body:", JSON.stringify(described.detail, null, 2));
    process.exit(1);
  }
}

main();
