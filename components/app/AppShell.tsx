"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { FolderOpen, Home, type LucideIcon, Scissors, Sparkles } from "lucide-react";
import { PageTransition } from "@/components/motion/PageTransition";
import { usePrefersReducedMotion } from "@/components/motion/usePrefersReducedMotion";
import { base } from "@/components/motion/presets";
import { Wordmark } from "@/components/ui/Wordmark";
import { useProfile } from "@/lib/store/profile";
import { cn } from "@/lib/cn";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/app", label: "Home", icon: Home },
  { href: "/app/ideas", label: "Ideas", icon: Sparkles },
  { href: "/app/studio", label: "Studio", icon: Scissors },
  { href: "/app/library", label: "Library", icon: FolderOpen },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile } = useProfile();
  const reduced = usePrefersReducedMotion();
  const initial = profile.displayName.slice(0, 1).toUpperCase();

  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname.startsWith(href);

  return (
    <div className="workspace min-h-screen bg-canvas">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-hairline bg-canvas/85 px-4 backdrop-blur-md md:hidden">
        <Wordmark href="/app" />
        <Link
          href="/app/settings"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[12px] font-medium text-on-brand"
          aria-label="Settings"
        >
          {initial}
        </Link>
      </header>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col border-r border-hairline bg-surface/60 backdrop-blur-sm md:flex">
        <div className="flex h-16 items-center px-6">
          <Wordmark href="/app" />
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
          {NAV.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-[var(--radius-control,10px)] px-3 py-2.5 text-[13.5px]",
                  "transition-colors duration-[var(--dur-fast,140ms)]",
                  active ? "text-ink" : "text-muted hover:text-ink",
                )}
              >
                {/* One element that travels between items, instead of a
                    background appearing and disappearing in place. */}
                {active ? (
                  <motion.span
                    layoutId={reduced ? undefined : "nav-active"}
                    className="absolute inset-0 rounded-[var(--radius-control,10px)] bg-surface-warm shadow-hairline"
                    transition={base}
                  />
                ) : (
                  <span className="absolute inset-0 rounded-[var(--radius-control,10px)] opacity-0 transition-opacity duration-[var(--dur-fast,140ms)] group-hover:bg-surface-warm/60 group-hover:opacity-100" />
                )}
                <Icon
                  className={cn(
                    "relative h-[17px] w-[17px] transition-colors",
                    active ? "text-brand" : "text-muted group-hover:text-ink",
                  )}
                  strokeWidth={1.75}
                />
                <span className={cn("relative", active && "font-medium")}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3">
          <div className="rule mx-1 mb-3" />
          <Link
            href="/app/settings"
            className={cn(
              "flex items-center gap-2.5 rounded-[var(--radius-control,10px)] px-3 py-2.5 text-[13.5px] transition-colors",
              isActive("/app/settings")
                ? "bg-surface-warm font-medium text-ink shadow-hairline"
                : "text-muted hover:bg-surface-warm/60 hover:text-ink",
            )}
          >
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-ink text-[10px] font-medium text-on-brand">
              {initial}
            </span>
            <span className="truncate">{profile.displayName || "Settings"}</span>
          </Link>
        </div>
      </aside>

      <main className="mx-auto max-w-[1140px] px-5 pb-28 pt-8 md:ml-[232px] md:max-w-none md:px-12 md:pb-20 md:pt-12">
        <PageTransition>{children}</PageTransition>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-canvas/90 backdrop-blur-md md:hidden">
        <div className="flex justify-around px-2 py-2">
          {NAV.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center gap-1 rounded-[10px] px-3 py-1.5 text-[11px] transition-colors",
                  active ? "text-ink" : "text-muted",
                )}
              >
                <Icon
                  className={cn("h-[18px] w-[18px]", active && "text-brand")}
                  strokeWidth={1.75}
                />
                {item.label}
                {active && !reduced ? (
                  <motion.span
                    layoutId="nav-active-mobile"
                    className="absolute -top-[9px] h-[2px] w-6 rounded-full bg-brand"
                    transition={base}
                  />
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
