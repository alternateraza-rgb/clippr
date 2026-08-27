"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { Pill } from "@/components/ui/Pill";

const INCLUDED = [
  "Unlimited clips — no credits, no monthly cap",
  "The full edit: cuts, framing, captions burned in",
  "Ideas picked for your niche every morning",
  "Your library kept, re-downloadable any time",
];

export function CheckoutPanel({ name }: { name: string }) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setStarting(true);
    setError("");
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = (await res.json()) as {
        url?: string;
        alreadySubscribed?: boolean;
        message?: string;
      };

      if (data.alreadySubscribed) {
        router.replace("/app");
        return;
      }
      if (!res.ok || !data.url) throw new Error(data.message || "Could not start checkout.");

      // Whop hosts the card form. Leaving our origin is the point: card details
      // never touch this app.
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
      setStarting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[440px]">
      <p className="eyebrow text-brand">Last step</p>
      <h1 className="display mt-3 text-d4 text-ink">
        {name ? `You're set up, ${name}.` : "You're set up."}
      </h1>
      <p className="mt-3 text-md text-body">
        Your desk is ready. Start your plan and the studio opens.
      </p>

      <div className="mt-8 rounded-panel bg-void p-6 text-white">
        <div className="flex items-baseline gap-2">
          <span className="display text-d5 text-white">$150</span>
          <span className="text-md text-white/55">/ month</span>
        </div>
        <p className="mt-2 text-base text-white/60">Unlimited clips. Cancel any time.</p>

        <ul className="mt-6 space-y-2.5">
          {INCLUDED.map((item) => (
            <li key={item} className="flex gap-2.5 text-base text-white/85">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={2.4} />
              {item}
            </li>
          ))}
        </ul>

        <Pill
          size="lg"
          className="mt-7 w-full"
          onClick={start}
          loading={starting}
          icon={<ArrowRight className="order-2 h-4 w-4" strokeWidth={2} />}
        >
          Start my plan
        </Pill>

        <p className="mt-3 text-center text-caption text-white/45">
          Secure checkout by Whop. Card details never touch Clipmuse.
        </p>
      </div>

      {error ? <p className="mt-4 text-sm text-brand">{error}</p> : null}
    </div>
  );
}
