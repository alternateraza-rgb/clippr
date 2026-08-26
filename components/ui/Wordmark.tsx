import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";

export function Wordmark({
  href = "/",
  className,
  size = 22,
  tone = "brand",
}: {
  href?: string;
  className?: string;
  size?: number;
  tone?: "brand" | "ink" | "on-dark";
}) {
  return (
    <Link
      href={href}
      aria-label="Clipmuse"
      className={cn(
        "inline-flex items-center gap-[7px] font-display font-semibold tracking-[-0.035em]",
        tone === "on-dark" ? "text-white" : "text-ink",
        className,
      )}
      style={{ fontSize: size }}
    >
      <LogoMark size={size * 1.16} tone={tone} />
      <span>Clipmuse</span>
    </Link>
  );
}
