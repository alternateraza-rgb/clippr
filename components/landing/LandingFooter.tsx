import Link from "next/link";
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
    <footer className="border-t border-hairline">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 py-12">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Wordmark />
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13.5px] text-body">
            {LEGAL.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-ink">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-col gap-2 border-t border-hairline pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-muted">
            Built for anyone who wants to make money online.
          </p>
          <p className="text-[13px] text-muted">
            © {new Date().getFullYear()} Clipmuse
          </p>
        </div>
      </div>
    </footer>
  );
}
