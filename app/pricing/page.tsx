import type { Metadata } from "next";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { PricingPlan } from "@/components/landing/PricingPlan";
import { StartCta } from "@/components/landing/StartCta";
import { Reveal } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Pricing — Clipmuse",
  description: "$150 a month for unlimited AI-edited clips. No credits, no per-export fees.",
};

const FAQS = [
  {
    q: "What does unlimited actually mean?",
    a: "Unlimited generations. There is no credit balance, no monthly export cap, and no charge per clip — paste as many longform videos as you want.",
  },
  {
    q: "Is there a free trial?",
    a: "Not right now. The plan starts when you finish signing up — $150 a month, unlimited clips, and you can cancel any time and keep access to the end of the month you paid for.",
  },
  {
    q: "Can I cancel?",
    a: "Any time, and you keep access until the end of the month you already paid for. Clips you have already made stay in your library.",
  },
  {
    q: "Do I need my own footage?",
    a: "No. Most people clip other creators' podcasts, streams, and interviews. You paste a YouTube link and get a vertical clip back.",
  },
];

export default function PricingPage() {
  return (
    <div className="bg-canvas">
      <LandingNav />
      <PricingPlan />

      <section className="bg-surface-warm px-6 py-20 md:py-28">
        <div className="mx-auto max-w-[1120px]">
          <Reveal>
            <p className="eyebrow text-brand">Questions</p>
            <h2 className="display mt-4 max-w-[18ch] text-[clamp(30px,4.4vw,44px)]">
              What you&apos;re <span className="text-brand">paying for</span>.
            </h2>
          </Reveal>

          <Reveal className="mt-12 grid gap-x-16 gap-y-10 md:grid-cols-2">
            {FAQS.map((item) => (
              <div key={item.q}>
                <p className="text-[17px] font-medium text-ink">{item.q}</p>
                <p className="mt-2 max-w-[48ch] text-[15px] leading-relaxed text-body">{item.a}</p>
              </div>
            ))}
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mt-16 flex flex-wrap items-center gap-4 border-t border-hairline pt-10">
              <p className="text-[15px] text-body">Ready when you are.</p>
              <StartCta size="lg">Start clipping</StartCta>
            </div>
          </Reveal>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
