import { ClipFrame } from "@/components/landing/ClipFrame";
import { RotatingWord } from "@/components/landing/RotatingWord";
import { StartCta } from "@/components/landing/StartCta";
import { Pill } from "@/components/ui/Pill";
import { SHOWCASE } from "@/lib/fixtures/showcase";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-16 md:pb-28 md:pt-24">
      <div className="mx-auto max-w-[1120px]">
        {/* The headline brackets the product rather than sitting beside it —
            you read the promise, see the thing, then read the payoff. */}
        <h1 className="display-xl mx-auto max-w-[16ch] text-center text-[clamp(42px,8.2vw,86px)] text-ink">
          <span className="block">
            Turn one{" "}
            <RotatingWord words={["podcast", "stream", "interview", "sermon", "VOD"]} />
          </span>
        </h1>

        <div className="mx-auto mt-10 grid max-w-[720px] grid-cols-3 items-center gap-3 sm:gap-5 md:mt-12">
          <ClipFrame clip={SHOWCASE[0]} className="translate-y-5 -rotate-3" />
          <ClipFrame clip={SHOWCASE[1]} autoplay priority className="scale-[1.06] shadow-pop" />
          <ClipFrame clip={SHOWCASE[2]} className="translate-y-5 rotate-3" />
        </div>

        <h2 className="display-xl mx-auto mt-10 max-w-[18ch] text-center text-[clamp(42px,8.2vw,86px)] text-ink md:mt-12">
          into a week of clips
        </h2>

        <p className="mx-auto mt-7 max-w-[46ch] text-center text-[17px] leading-relaxed text-body">
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

        <p className="mt-5 text-center text-[13px] text-muted">
          $150 a month · Unlimited clips · Cancel any time
        </p>
      </div>
    </section>
  );
}
