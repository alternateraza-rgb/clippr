import Link from "next/link";
import { Pill } from "@/components/ui/Pill";
import { Wordmark } from "@/components/ui/Wordmark";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline/70 bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
        <Wordmark />
        <nav className="hidden items-center gap-8 text-[14px] text-body md:flex">
          <a href="#how" className="hover:text-ink">
            How it works
          </a>
          <a href="#reviews" className="hover:text-ink">
            Reviews
          </a>
          <a href="#faq" className="hover:text-ink">
            FAQ
          </a>
          <Link href="/pricing" className="hover:text-ink">
            Pricing
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Pill href="/login" variant="text" className="hidden sm:inline-flex">
            Log in
          </Pill>
          <Pill href="/signup">Start making money</Pill>
        </div>
      </div>
    </header>
  );
}
