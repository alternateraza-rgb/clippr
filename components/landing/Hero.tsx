import { HeroClips } from "@/components/landing/HeroClips";
import { RotatingWord } from "@/components/landing/RotatingWord";
import { StartCta } from "@/components/landing/StartCta";
import { CountUp } from "@/components/motion/CountUp";
import { Pill } from "@/components/ui/Pill";

const PROOF = [
  { to: 10400, prefix: "$", label: "avg. member payout / mo" },
  { to: 2.3, decimals: 1, suffix: "M+", label: "views generated" },
  { to: 1200, suffix: "+", label: "people earning" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-16 md:pb-28 md:pt-24">
      <div className="mx-auto max-w-[1120px]">
        {/* The headline brackets the product rather than sitting beside it —
            you read the promise, see the thing, then read the payoff. */}
        <h1 className="display mx-auto max-w-[16ch] text-center text-d6 text-ink">
          <span className="block">
            Turn one{" "}
            <RotatingWord words={["podcast", "stream", "interview", "sermon", "VOD"]} />
          </span>
        </h1>

        <HeroClips />

        <h2 className="display mx-auto mt-10 max-w-[18ch] text-center text-d6 text-ink md:mt-12">
          into a week of clips
        </h2>

        <p className="mx-auto mt-7 max-w-[46ch] text-center text-lg text-body">
          Paste a link. Clipmuse watches the whole thing, finds the moment worth
          posting, and edits it into a vertical clip with captions already burned
          in. No camera, no editing, no experience.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <StartCta size="lg" />
          <Pill href="#how" variant="outline" size="lg">
            See how it works
          </Pill>
        </div>

        <p className="mt-5 text-center text-sm text-muted">
          $150 a month · Unlimited clips · Cancel any time
        </p>

        <dl className="mx-auto mt-16 grid max-w-[760px] grid-cols-1 gap-px overflow-hidden rounded-panel bg-hairline sm:grid-cols-3">
          {PROOF.map((stat) => (
            <div key={stat.label} className="bg-canvas px-6 py-7 text-center">
              <dt className="display tnum text-d3 text-ink">
                <CountUp
                  to={stat.to}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  decimals={stat.decimals}
                />
              </dt>
              <dd className="mt-1.5 text-sm text-muted">{stat.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
