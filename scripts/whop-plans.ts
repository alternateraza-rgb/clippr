import "../lib/load-env";
import { WhopClient } from "@whop/sdk";

/**
 * Prints the plans on your Whop account, so WHOP_PLAN_ID can be copied rather
 * than hunted for in a dashboard. Reads the same keys the app uses.
 */
async function main() {
  const token = process.env.WHOP_API_KEY;
  const accountId = process.env.WHOP_COMPANY_ID;

  if (!token) {
    console.error("[whop] WHOP_API_KEY missing — add it to .env.local");
    process.exit(1);
  }

  const client = new WhopClient({ token });
  const page = await client.plans.list(accountId ? { account_id: accountId } : {});

  let found = 0;
  for await (const plan of page) {
    found++;
    const period =
      plan.plan_type === "renewal"
        ? `every ${plan.billing_period ?? "?"} days`
        : "one-time";
    console.log(
      [
        plan.id,
        (plan.title ?? plan.description ?? "untitled").slice(0, 40).padEnd(40),
        plan.formatted_price.padStart(10),
        period.padEnd(18),
        plan.visibility,
      ].join("  "),
    );
  }

  if (!found) {
    console.log("[whop] No plans on this account. Check WHOP_COMPANY_ID.");
  }
}

main().catch((error) => {
  console.error("[whop]", error instanceof Error ? error.message : error);
  process.exit(1);
});
