import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { IDEAS } from "@/lib/fixtures/ideas";

export function LandingIdeas() {
  const items = IDEAS.filter((i) => i.score >= 70).slice(0, 3);

  return (
    <section id="ideas" className="py-28">
      <div className="mx-auto max-w-[1200px] px-6">
        <Reveal>
          <p className="eyebrow">Today&apos;s paydays</p>
          <h2 className="display mt-4 max-w-[18ch] text-[clamp(32px,5vw,48px)]">
            Longform that&apos;s already sitting on money it hasn&apos;t made{" "}
            <em className="serif-em">yet</em>.
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {items.map((idea, i) => (
            <Reveal key={idea.id} delay={i * 0.08}>
              <article className="flex h-full flex-col rounded-[20px] bg-surface p-6 shadow-hairline">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-[13px] text-muted">{idea.video.channel}</p>
                  <ScoreRing score={idea.score} size={48} />
                </div>
                <h3 className="mt-4 line-clamp-3 font-display text-[22px] font-light leading-snug tracking-tight">
                  {idea.hook}
                </h3>
                <p className="mt-3 flex-1 text-[14px] text-body">{idea.whyItClips}</p>
              </article>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-10">
          <Link href="/signup" className="text-[14px] text-brand hover:underline">
            Get paid ideas, picked for you →
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
