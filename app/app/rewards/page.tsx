"use client";

import { motion } from "framer-motion";
import { ArrowRight, Clapperboard, Coins, Send } from "lucide-react";
import { CreatorOrbit } from "@/components/app/rewards/CreatorOrbit";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Chip";
import { Pill } from "@/components/ui/Pill";
import { Reveal } from "@/components/motion/Reveal";
import { usePrefersReducedMotion } from "@/components/motion/usePrefersReducedMotion";

const STEPS = [
  {
    n: "01",
    icon: Clapperboard,
    title: "Pick a creator",
    body: "Browse campaigns from podcasters and course sellers who want their longform cut up. No audience of your own required.",
  },
  {
    n: "02",
    icon: Coins,
    title: "Cut clips in Studio",
    body: "Paste their video, let Clippr find the moments, and render as many verticals as you want from a single upload.",
  },
  {
    n: "03",
    icon: Send,
    title: "Post and get paid",
    body: "Publish to your own accounts. Views are tracked against the campaign and paid out per thousand.",
  },
];

/* The rate applied to view counts people actually hit. Concrete beats a range
   floating on its own — "$1–10" means nothing until it's multiplied. */
const MATH = [
  { views: "10K views", low: 10, high: 100 },
  { views: "100K views", low: 100, high: 1_000 },
  { views: "1M views", low: 1_000, high: 10_000 },
];

const money = (n: number) => `$${n.toLocaleString("en-US")}`;

export default function RewardsPage() {
  const reduced = usePrefersReducedMotion();

  return (
    <div>
      <PageHeader
        eyebrow="Content Rewards"
        title="Get paid to clip other people's videos."
        lede="Creators pay for the clips they don't have time to cut. You bring the edit, they bring the longform, the views do the rest."
        action={<Tag tone="brand">Coming soon</Tag>}
      />

      {/* The stage. Dark, because it stands in for a screen — the one place in
          the workspace where decoration is spent on the product itself. */}
      <Reveal className="mt-section">
        <div className="relative overflow-hidden rounded-panel bg-void px-6 py-12 md:px-12 md:py-16">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-8">
            <div className="relative">
              <p className="eyebrow text-brand">The rate</p>
              <p className="display mt-4 text-d5 text-white">
                $1<span className="text-white/40">–</span>10
              </p>
              <p className="mt-2 text-lg text-white/60">per 1,000 views</p>
              <div className="rule-dark my-7 max-w-[280px]" />
              <p className="max-w-[38ch] text-md text-white/70">
                Every campaign sets its own rate inside that band. You cut, you post,
                and the payout follows the views — not a flat fee, not a pitch, not an
                application.
              </p>
            </div>

            <CreatorOrbit />
          </div>
        </div>
      </Reveal>

      {/* What the rate is actually worth. */}
      <Reveal className="mt-block" delay={0.05}>
        <Card padding="none" className="overflow-hidden">
          <div className="grid divide-y divide-hairline sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {MATH.map((row) => (
              <div key={row.views} className="px-6 py-6">
                <p className="text-caption font-medium text-muted">{row.views}</p>
                {/* No `tnum` here: these are static figures, and tabular commas
                    set a full digit's width open a gap inside "$1,000". */}
                <p className="display mt-2 text-d2 text-ink">
                  {money(row.low)}
                  <span className="text-muted">–</span>
                  {money(row.high)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </Reveal>

      <section className="mt-band">
        <Reveal>
          <p className="eyebrow text-brand">How it will work</p>
          <h2 className="display mt-2.5 text-d3 text-ink">Three steps, no gatekeeping.</h2>
        </Reveal>

        <Reveal className="mt-8 grid gap-5 md:grid-cols-3" delay={0.05}>
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <article
                key={step.n}
                className="flex h-full flex-col rounded-card bg-surface p-7 shadow-hairline"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-[18px] w-[18px] text-brand" strokeWidth={1.9} />
                  <span className="tnum text-caption font-semibold text-muted">
                    {step.n}
                  </span>
                </div>
                <h3 className="display mt-5 text-d1 text-ink">{step.title}</h3>
                <p className="mt-2.5 text-md text-body">{step.body}</p>
              </article>
            );
          })}
        </Reveal>
      </section>

      {/* The honest ending: this isn't on yet, and the page shouldn't pretend
          there's a button to press. */}
      <Reveal className="mt-band">
        <div className="relative overflow-hidden rounded-panel border border-dashed border-hairline-strong bg-surface px-6 py-16 text-center">
          {!reduced ? (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-brand-soft to-transparent"
              animate={{ x: ["0%", "400%"] }}
              transition={{ duration: 4.2, repeat: Infinity, repeatDelay: 1.6, ease: "linear" }}
            />
          ) : null}

          <div className="relative">
            <Tag tone="brand">Coming soon</Tag>
            <p className="display mx-auto mt-6 max-w-[16ch] text-d4 text-ink">
              Content Rewards isn&apos;t live yet.
            </p>
            <p className="mx-auto mt-4 max-w-[46ch] text-md text-body">
              We&apos;re lining up the first campaigns. When it opens it turns on right
              here — nothing to sign up for, nothing to wait in line behind.
            </p>
            <div className="mt-8">
              <Pill href="/app/studio" variant="dark" icon={<ArrowRight className="h-4 w-4" strokeWidth={2} />}>
                Cut a clip meanwhile
              </Pill>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
