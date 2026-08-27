import { Plus } from "lucide-react";
import { Band, SectionHead } from "@/components/landing/Section";
import { Reveal } from "@/components/motion/Reveal";

const FAQS = [
  {
    q: "Do I need experience?",
    a: "No. The AI handles the editing, captions, and formatting. If you can paste a link, you can start.",
  },
  {
    q: "Do I need to show my face?",
    a: "Not at all. Most people clip other creators' podcasts, streams, and interviews — no camera required.",
  },
  {
    q: "How fast can I start?",
    a: "Paste your first video and you'll have a ready-to-post clip in minutes.",
  },
  {
    q: "How do I actually get paid?",
    a: "Platform payouts, getting paid to clip for other creators, or growing your own page for brand deals — most people combine more than one.",
  },
  {
    q: "What do I need to run it?",
    a: "A browser and a link. Clips render on our side and download to your device the moment they're finished.",
  },
  {
    q: "Can I cancel?",
    a: "Any time. Your plan stops at the end of the month you already paid for, and your library stays downloadable.",
  },
];

export function LandingFAQ() {
  return (
    <Band id="faq">
      <div className="grid gap-12 md:grid-cols-[minmax(0,340px)_1fr] md:gap-16">
        <SectionHead
          eyebrow="Questions"
          title={
            <>
              Before you <span className="text-brand">start</span>.
            </>
          }
        />
        <Reveal>
          {/* <details> rather than state: it opens before hydration, it is
              keyboard-operable for free, and Cmd-F finds closed answers. */}
          <div className="divide-y divide-hairline border-y border-hairline">
            {FAQS.map((faq) => (
              <details key={faq.q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-lg font-medium text-ink marker:hidden [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <Plus
                    className="h-4 w-4 shrink-0 text-muted transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-soft)] group-open:rotate-45"
                    strokeWidth={2}
                  />
                </summary>
                <p className="max-w-[56ch] pb-6 text-md text-body">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </Reveal>
      </div>
    </Band>
  );
}
