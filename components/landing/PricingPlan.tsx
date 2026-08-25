import { Check } from "lucide-react";
import { Orb } from "@/components/motion/Orb";
import { Reveal } from "@/components/motion/Reveal";
import { Pill } from "@/components/ui/Pill";

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
    <section className="relative overflow-hidden">
      <Orb className="-left-32 top-0 h-[420px] w-[420px] md:left-[46%] md:h-[520px] md:w-[520px]" />

      <div className="relative mx-auto max-w-[1200px] px-6 pb-24 pt-20 md:pb-32 md:pt-28">
        <Reveal>
          <p className="eyebrow text-brand">Pricing</p>
          <h1 className="display mt-5 max-w-[16ch] text-[clamp(38px,6vw,64px)] text-ink">
            One price. <em className="serif-em">Unlimited</em> clips.
          </h1>
          <p className="mt-6 max-w-[46ch] text-[17px] leading-relaxed text-body">
            No credit packs, no per-export fees, no counting how many videos you
            have left this month. One plan, everything in it.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-10 md:grid-cols-[minmax(0,420px)_1fr] md:gap-16">
          <Reveal>
            <div className="rounded-[24px] bg-surface p-8 shadow-lift">
              <p className="eyebrow text-muted">Everything, monthly</p>

              <div className="mt-5 flex items-baseline gap-2">
                <span className="font-display text-[64px] font-light leading-none tracking-tight text-ink">
                  $150
                </span>
                <span className="text-[15px] text-muted">/ month</span>
              </div>

              <p className="mt-4 text-[14px] leading-relaxed text-body">
                Unlimited generations. Cancel whenever you like — it stops at the
                end of the month you already paid for.
              </p>

              <Pill href="/signup" className="mt-8 w-full py-3.5">
                Start clipping
              </Pill>

              <p className="mt-4 text-center text-[12.5px] text-muted">
                Takes a minute to set up. No card required to look around.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-7">
            {INCLUDED.map((item, i) => (
              <Reveal key={item.title} delay={0.04 * i}>
                <div className="flex gap-4">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10">
                    <Check className="h-3.5 w-3.5 text-brand" strokeWidth={2.5} />
                  </span>
                  <div>
                    <p className="text-[16px] font-medium text-ink">{item.title}</p>
                    <p className="mt-1 max-w-[46ch] text-[14px] leading-relaxed text-body">
                      {item.detail}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
