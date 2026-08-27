import Link from "next/link";
import { StartCta } from "@/components/landing/StartCta";
import { Wordmark } from "@/components/ui/Wordmark";

// Payment processors verify that these are reachable from the site, so they
// live in the footer of every page rather than only where they are relevant.
const LEGAL = [
  { href: "/pricing", label: "Pricing" },
  { href: "/terms", label: "Terms of service" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/refunds", label: "Refund policy" },
];

export function LandingFooter() {
  return (
    <footer className="bg-void px-6 text-white">
      <div className="mx-auto max-w-[1120px]">
        <div className="flex flex-col items-start gap-8 py-20 md:flex-row md:items-end md:justify-between md:py-24">
          <h2 className="display max-w-[14ch] text-d5 text-white">
            One link is all it takes.
          </h2>
          <StartCta size="lg" />
        </div>

        <div className="rule-dark" />

        <div className="flex flex-col gap-8 py-10 md:flex-row md:items-center md:justify-between">
          <Wordmark tone="on-dark" size={20} />
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/60">
            {LEGAL.map((item) => (
              <Link key={item.href} href={item.href} className="transition-colors hover:text-white">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-void-line py-8 text-caption text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>Built for anyone who wants to make money online.</p>
          <p>© {new Date().getFullYear()} Clipmuse</p>
        </div>
      </div>
    </footer>
  );
}
