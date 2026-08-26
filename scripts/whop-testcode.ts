import "../lib/load-env";
import { randomBytes } from "node:crypto";
import { WhopClient } from "@whop/sdk";
import { describeWhopError } from "../lib/billing/error";

/**
 * Creates a single-use 100%-off code so the live checkout can be walked
 * end to end without moving money.
 *
 * A 100%-off code on a live product is free inventory if it escapes, so this
 * deliberately makes one that cannot: a random name nobody will guess, stock
 * of one, one per customer, and an expiry a day out. Test with it, then let it
 * lapse.
 */
async function main() {
  const token = process.env.WHOP_API_KEY;
  const accountId = process.env.WHOP_COMPANY_ID;
  const planId = process.env.WHOP_PLAN_ID;
  const productId = process.env.WHOP_PRODUCT_ID;

  if (!token || !accountId) {
    console.error("[whop] WHOP_API_KEY and WHOP_COMPANY_ID are both needed in .env.local");
    process.exit(1);
  }

  const code = `TEST${randomBytes(4).toString("hex").toUpperCase()}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const client = new WhopClient({ token });

  try {
    await client.promoCodes.create({
      account_id: accountId,
      code,
      promo_type: "percentage",
      amount_off: 100,
      base_currency: "usd",
      // One month of free, which is all a checkout test needs.
      promo_duration_months: 1,
      new_users_only: false,
      one_per_customer: true,
      stock: 1,
      unlimited_stock: false,
      expires_at: expiresAt,
      // Scoped to what you actually sell, so it cannot be spent elsewhere.
      ...(planId ? { plan_ids: [planId] } : {}),
      ...(!planId && productId ? { product_id: productId } : {}),
    });

    console.log("");
    console.log("  code:      " + code);
    console.log("  value:     100% off, 1 month");
    console.log("  stock:     1 (one use, then dead)");
    console.log("  expires:   " + expiresAt);
    console.log("  scoped to: " + (planId || productId || "the whole account"));
    console.log("");
    console.log("  Enter it at Whop checkout. It expires on its own in 24h.");
    console.log("");
  } catch (error) {
    const described = describeWhopError(error);
    console.error("[whop] FAILED", described.statusCode ?? "");
    console.error("       ", described.message);
    console.error("        body:", JSON.stringify(described.detail, null, 2));
    process.exit(1);
  }
}

main();
