import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Band, SectionHead } from "@/components/landing/Section";
import { Reveal } from "@/components/motion/Reveal";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { IDEAS } from "@/lib/fixtures/ideas";

export function LandingIdeas() {
  const items = IDEAS.filter((i) => i.score >= 70).slice(0, 3);

  return (
    <Band id="ideas" tone="warm">
      <SectionHead
        eyebrow="Today's paydays"
        title={
          <>
            Longform already sitting on money it hasn&apos;t made{" "}
            <span className="text-brand">yet</span>.
          </>
        }
        lede="Every morning Clipmuse reads what's new in your niche and hands you the videos worth cutting, with the reason it thinks so."
      />
      <Reveal className="mt-14 grid gap-5 md:grid-cols-3">
        {items.map((idea) => (
          <article
            key={idea.id}
            className="flex h-full flex-col rounded-[var(--radius-card)] bg-surface p-7 shadow-hairline"
          >
              <div className="flex items-start justify-between gap-4">
                <p className="text-[12.5px] font-medium text-muted">{idea.video.channel}</p>
                <ScoreRing score={idea.score} size={42} />
              </div>
              <h3 className="display mt-5 line-clamp-3 text-[20px] leading-snug text-ink">
                {idea.hook}
              </h3>
              <p className="mt-3 flex-1 text-[14.5px] leading-relaxed text-body">
                {idea.whyItClips}
              </p>
              <p className="mt-6 border-t border-hairline pt-4 text-[12.5px] text-muted">
                {idea.estimatedClipCount} cuts in this one
              </p>
          </article>
        ))}
      </Reveal>
      <Reveal className="mt-10">
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 text-[15px] font-medium text-brand hover:underline"
        >
          Get ideas picked for your niche
          <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </Link>
      </Reveal>
    </Band>
  );
}
