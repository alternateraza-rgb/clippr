import { Star } from "lucide-react";
import { Band, SectionHead } from "@/components/landing/Section";
import { Reveal } from "@/components/motion/Reveal";
import { Tag } from "@/components/ui/Chip";

/**
 * Sample reviews. Written in-house to show the shape of the section, not
 * collected from anyone — hence the label on each card. Swap these for real
 * ones as members send them in and the labels come off with them.
 */
const REVIEWS = [
  {
    name: "Jordan M.",
    initials: "JM",
    handle: "clips podcasts",
    quote:
      "Made $8,200 last month clipping in my spare time. No camera, no editing skills, just followed the steps.",
  },
  {
    name: "Aaliyah R.",
    initials: "AR",
    handle: "clips interviews",
    quote: "My first AI-cut clip hit 400K views. Two months later I crossed $10K.",
  },
  {
    name: "Marcus T.",
    initials: "MT",
    handle: "clips for creators",
    quote:
      "I don't even film my own content — I clip other people's podcasts and get paid to post.",
  },
];

function Stars() {
  return (
    <div className="flex gap-0.5" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className="h-3.5 w-3.5 text-brand" fill="currentColor" strokeWidth={0} />
      ))}
    </div>
  );
}

export function LandingReviews() {
  return (
    <Band id="reviews" tone="warm">
      <SectionHead
        eyebrow="Reviews"
        title={
          <>
            What getting <span className="text-brand">paid</span> looks like.
          </>
        }
      />
      <Reveal className="mt-14 grid gap-5 md:grid-cols-3">
        {REVIEWS.map((review) => (
          <article
            key={review.name}
            className="flex h-full flex-col rounded-[var(--radius-card)] bg-surface p-7 shadow-hairline"
          >
            <div className="flex items-center justify-between gap-3">
              <Stars />
              <Tag>Sample</Tag>
            </div>
            <p className="mt-5 flex-1 text-[15.5px] leading-relaxed text-ink">
              &ldquo;{review.quote}&rdquo;
            </p>
            <div className="mt-7 flex items-center gap-3 border-t border-hairline pt-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-[12px] font-semibold text-on-brand">
                {review.initials}
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-ink">{review.name}</p>
                <p className="truncate text-[12.5px] text-muted">{review.handle}</p>
              </div>
            </div>
          </article>
        ))}
      </Reveal>
    </Band>
  );
}
