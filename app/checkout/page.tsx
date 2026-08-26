import { redirect } from "next/navigation";
import { CheckoutPanel } from "@/components/billing/CheckoutPanel";
import { Wordmark } from "@/components/ui/Wordmark";
import { getSessionUser } from "@/lib/auth/session";
import { billingEnforced } from "@/lib/config";
import { hasAccess, readSubscription } from "@/lib/billing/subscription";

export const metadata = { title: "Start your plan — Clipmuse" };

export default async function CheckoutPage() {
  // With billing off there is nothing to sell, so this page must not exist as
  // a dead end someone can be bounced into.
  if (!billingEnforced()) redirect("/app");

  const user = await getSessionUser();
  if (!user) redirect("/login");

  const subscription = await readSubscription(user.id);
  if (hasAccess(subscription)) redirect("/app");

  const name =
    (user.user_metadata?.display_name as string | undefined)?.split(" ")[0] ?? "";

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="border-b border-hairline px-6">
        <div className="mx-auto flex h-[62px] max-w-[1120px] items-center">
          <Wordmark size={20} />
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center px-6 py-14">
        <CheckoutPanel name={name} />
      </div>
    </div>
  );
}
