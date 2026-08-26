import { redirect } from "next/navigation";
import { Activating } from "@/components/billing/Activating";
import { Wordmark } from "@/components/ui/Wordmark";
import { getSessionUser } from "@/lib/auth/session";

export const metadata = { title: "Setting up — Clipmuse" };

export default async function ActivatingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="border-b border-hairline px-6">
        <div className="mx-auto flex h-[62px] max-w-[1120px] items-center">
          <Wordmark size={20} />
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center px-6 py-14">
        <Activating />
      </div>
    </div>
  );
}
