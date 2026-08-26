import Link from "next/link";
import { LandingAuthLinks } from "@/components/landing/LandingAuthLinks";
import { Wordmark } from "@/components/ui/Wordmark";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#get-paid", label: "The money" },
  { href: "/#reviews", label: "Reviews" },
  { href: "/pricing", label: "Pricing" },
];

export function LandingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-[62px] max-w-[1120px] items-center justify-between gap-6 px-6">
        <Wordmark size={20} />
        <nav className="hidden items-center gap-7 text-[14px] text-body md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors duration-[var(--dur-fast)] hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LandingAuthLinks />
        </div>
      </div>
    </header>
  );
}
