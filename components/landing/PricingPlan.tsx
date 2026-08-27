import { Check } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { StartCta } from "@/components/landing/StartCta";

const INCLUDED = [
  {
    title: "Unlimited clips",
    detail: "No credits, no monthly cap, no per-export charge. Paste as many videos as you want.",
  },
  {
    title: "The full edit, not just captions",
    detail:
      "Every clip is cut into a story, framed on the speaker, punched in on the beat, and captioned word by word.",
  },
  {
    title: "One clip per video, chosen for you",
    detail:
      "The model reads the whole transcript, picks the strongest topic, and assembles the moments that tell it.",
  },
  {
    title: "Ready to post",
    detail: "Vertical 9:16 mp4, burned-in captions, downloads to your device the moment it is done.",
  },
  {
    title: "Your library, kept",
    detail: "Every clip stays in your library to re-download whenever you need it again.",
  },
];

export function PricingPlan() {
  return (
    <section className="px-6 pb-20 pt-16 md:pb-28 md:pt-24">
      <div className="mx-auto max-w-[1120px]">
        <Reveal className="mx-auto max-w-[760px] text-center">
          <p className="eyebrow text-brand">Pricing</p>
          <h1 className="display mx-auto mt-5 max-w-[14ch] text-d6 text-ink">
            One price. <span className="text-brand">Unlimited</span> clips.
          </h1>
          <p className="mx-auto mt-6 max-w-[48ch] text-lg text-body">
            No credit packs, no per-export fees, no counting how many videos you
            have left this month. One plan, everything in it.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-8 md:grid-cols-[minmax(0,400px)_1fr] md:gap-16">
          <Reveal>
            <div className="rounded-panel bg-void p-8 text-white">
              <p className="eyebrow text-white/55">Everything, monthly</p>

              <div className="mt-5 flex items-baseline gap-2">
                <span className="display text-d5 text-white">$150</span>
                <span className="text-md text-white/55">/ month</span>
              </div>

              <p className="mt-5 text-base text-white/70">
                Unlimited generations. Cancel whenever you like — it stops at the
                end of the month you already paid for.
              </p>

              <StartCta size="lg" className="mt-8 w-full">
                Start clipping
              </StartCta>

              <p className="mt-4 text-center text-caption text-white/45">
                Takes a minute to set up. Cancel any time.
              </p>
            </div>
          </Reveal>

          <Reveal className="grid gap-7">
            {INCLUDED.map((item) => (
              <div key={item.title} className="flex gap-4">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft">
                    <Check className="h-3.5 w-3.5 text-brand" strokeWidth={2.5} />
                  </span>
                <div>
                  <p className="text-lg font-semibold text-ink">{item.title}</p>
                  <p className="mt-1 max-w-[48ch] text-base text-body">
                    {item.detail}
                  </p>
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
