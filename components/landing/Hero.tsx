"use client";

import { Orb } from "@/components/motion/Orb";
import { WordReveal } from "@/components/motion/Reveal";
import { ClipLoop } from "@/components/clip/ClipLoop";
import { ClipPreview } from "@/components/clip/ClipPreview";
import { Pill } from "@/components/ui/Pill";
import { ANALYSES } from "@/lib/fixtures/analyses";
import { VIDEOS } from "@/lib/fixtures/videos";

const demo = ANALYSES[VIDEOS.longTitle.videoId].candidates[0];

type HeroProps = {
  exampleClips?: string[];
};

export function Hero({ exampleClips = [] }: HeroProps) {
  return (
    <section className="relative overflow-hidden">
      <Orb className="-left-24 top-10 h-[420px] w-[420px] md:left-[42%] md:top-0 md:h-[560px] md:w-[560px]" />
      <div className="relative mx-auto grid max-w-[1200px] items-center gap-16 px-6 pb-24 pt-20 md:grid-cols-[1.15fr_0.85fr] md:pb-32 md:pt-28">
        <div>
          <p className="eyebrow text-brand">Make money online</p>
          <h1 className="display mt-5 max-w-[18ch] text-[clamp(40px,6.4vw,68px)] text-ink">
            <WordReveal text="Make $10,000/month using AI clipping." accentWord="$10000/month" />
          </h1>
          <p className="mt-6 max-w-[42ch] text-[17px] leading-relaxed text-body">
            AI clipping means turning long videos into short, viral-ready
            clips — automatically. No editing skills, no camera, no
            experience needed. Just AI, clips, and a payday.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Pill href="/signup" className="px-6 py-3">
              Start making money
            </Pill>
            <Pill href="#how" variant="ghost" className="px-6 py-3">
              See how it works
            </Pill>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted">
            <span>No camera needed</span>
            <span className="h-1 w-1 rounded-full bg-hairline" />
            <span>No editing skills</span>
            <span className="h-1 w-1 rounded-full bg-hairline" />
            <span>Start free</span>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-4 border-t border-hairline pt-6">
            <div>
              <p className="font-display text-[22px] font-light tracking-tight text-ink">
                $10,400
              </p>
              <p className="text-[12px] text-muted">avg. member payout/mo*</p>
            </div>
            <div>
              <p className="font-display text-[22px] font-light tracking-tight text-ink">
                2.3M+
              </p>
              <p className="text-[12px] text-muted">views generated*</p>
            </div>
            <div>
              <p className="font-display text-[22px] font-light tracking-tight text-ink">
                1,200+
              </p>
              <p className="text-[12px] text-muted">people earning*</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted/70">*Illustrative figures</p>
        </div>
        <div className="mx-auto w-full max-w-[320px]">
          {exampleClips.length > 0 ? (
            <ClipLoop sources={exampleClips} />
          ) : (
            <ClipPreview
              videoId={VIDEOS.longTitle.videoId}
              start={demo.start}
              duration={demo.end - demo.start}
              captionLines={demo.captionLines}
              preset="hormozi"
              gameplay="minecraft"
              fallbackText={demo.hook}
            />
          )}
        </div>
      </div>
    </section>
  );
}
