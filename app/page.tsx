import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { HowYouGetPaid } from "@/components/landing/HowYouGetPaid";
import { LandingFAQ } from "@/components/landing/LandingFAQ";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingIdeas } from "@/components/landing/LandingIdeas";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingReviews } from "@/components/landing/LandingReviews";
import { WhatYouGet } from "@/components/landing/WhatYouGet";

export default function LandingPage() {
  return (
    <div className="bg-canvas">
      <LandingNav />
      <Hero />
      <HowItWorks />
      <WhatYouGet />
      <HowYouGetPaid />
      <LandingIdeas />
      <LandingReviews />
      <LandingFAQ />
      <LandingFooter />
    </div>
  );
}
