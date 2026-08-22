import fs from "node:fs";
import path from "node:path";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { HowYouGetPaid } from "@/components/landing/HowYouGetPaid";
import { LandingFAQ } from "@/components/landing/LandingFAQ";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingIdeas } from "@/components/landing/LandingIdeas";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingReviews } from "@/components/landing/LandingReviews";
import { SmoothScroll } from "@/components/landing/SmoothScroll";
import { Reveal } from "@/components/motion/Reveal";

const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov"]);

function getExampleClips(): string[] {
  const dir = path.join(process.cwd(), "public", "clips");
  try {
    return fs
      .readdirSync(dir)
      .filter((file) => VIDEO_EXTENSIONS.has(path.extname(file).toLowerCase()))
      .sort()
      .map((file) => `/clips/${file}`);
  } catch {
    return [];
  }
}

export default function LandingPage() {
  const exampleClips = getExampleClips();

  return (
    <div className="bg-canvas">
      <SmoothScroll />
      <LandingNav />
      <Hero exampleClips={exampleClips} />
      <HowItWorks />
      <HowYouGetPaid />
      <section id="demo" className="bg-surface-warm py-28">
        <div className="mx-auto max-w-[1200px] px-6">
          <Reveal>
            <p className="eyebrow">Why it works</p>
            <h2 className="display mt-4 max-w-[18ch] text-[clamp(32px,5vw,48px)]">
              Captions that keep people watching — and <em className="serif-em">paying</em>.
            </h2>
            <p className="mt-5 max-w-[48ch] text-body">
              The AI handles the editing. You just post. Captions, formatting,
              and the hook are already done for you.
            </p>
          </Reveal>
        </div>
      </section>
      <LandingReviews />
      <LandingFAQ />
      <LandingIdeas />
      <LandingFooter />
    </div>
  );
}
