"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Pill } from "@/components/ui/Pill";
import { LEGAL_CONTACT } from "@/lib/legal";

/** How long to wait for the webhook before offering a way out. */
const GIVE_UP_MS = 45_000;

/**
 * Where Whop sends people after they pay.
 *
 * The redirect regularly beats the webhook, so this cannot simply forward to
 * /app — the proxy would find no subscription and bounce them straight back to
 * checkout, asking someone who has just paid to pay again. It waits here
 * instead, and when the wait runs long it says so rather than looping.
 */
export function Activating() {
  const router = useRouter();
  const [state, setState] = useState<"waiting" | "ready" | "slow">("waiting");

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    const poll = async () => {
      try {
        const res = await fetch("/api/billing/status", { cache: "no-store" });
        const data = (await res.json()) as { access?: boolean };
        if (cancelled) return;
        if (data.access) {
          setState("ready");
          // A beat on the confirmation, then through.
          setTimeout(() => router.replace("/app"), 900);
          return;
        }
      } catch {
        // Keep waiting; a dropped poll is not a failed payment.
      }
      if (cancelled) return;
      if (Date.now() - startedAt > GIVE_UP_MS) {
        setState("slow");
        return;
      }
      timer = setTimeout(poll, 2000);
    };

    let timer = setTimeout(poll, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [router]);

  return (
    <div className="mx-auto w-full max-w-[420px] text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft">
        {state === "ready" ? (
          <Check className="h-6 w-6 text-brand" strokeWidth={2.5} />
        ) : (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        )}
      </span>

      <h1 className="display mt-6 text-[28px] text-ink">
        {state === "ready"
          ? "You're in."
          : state === "slow"
            ? "Still confirming"
            : "Setting up your account"}
      </h1>

      <p className="mt-3 text-[15px] leading-relaxed text-body">
        {state === "ready"
          ? "Opening the studio."
          : state === "slow"
            ? "Your payment went through — the confirmation is taking longer than usual to reach us. Nothing is lost, and you have not been charged twice."
            : "Your payment went through. This takes a few seconds."}
      </p>

      {state === "slow" ? (
        <div className="mt-7 flex flex-col items-center gap-3">
          <Pill onClick={() => window.location.reload()}>Check again</Pill>
          <a
            href={`mailto:${LEGAL_CONTACT}`}
            className="text-[13.5px] text-body underline-offset-4 hover:text-ink hover:underline"
          >
            Still stuck? Email {LEGAL_CONTACT}
          </a>
        </div>
      ) : null}
    </div>
  );
}
