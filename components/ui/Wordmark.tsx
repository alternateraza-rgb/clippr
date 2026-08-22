import Link from "next/link";
import { cn } from "@/lib/cn";

export function Wordmark({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-baseline gap-0 font-display text-[17px] font-light tracking-[-0.02em] text-ink",
        className,
      )}
    >
      clip<span className="text-brand">muse</span>
    </Link>
  );
}
