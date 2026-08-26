"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderOpen, Home, type LucideIcon, Scissors, Sparkles } from "lucide-react";
import { PageTransition } from "@/components/motion/PageTransition";
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
  const initial = (profile.displayName || "C").slice(0, 1).toUpperCase();

  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname.startsWith(href);

  return (
    <div className="workspace min-h-screen">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-hairline bg-canvas/90 px-4 backdrop-blur-md md:hidden">
        <Wordmark href="/app" size={18} />
        <Link
          href="/app/settings"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[12px] font-semibold text-on-brand"
          aria-label="Settings"
        >
          {initial}
        </Link>
      </header>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[236px] flex-col border-r border-hairline bg-canvas md:flex">
        <div className="flex h-[62px] items-center px-5">
          <Wordmark href="/app" size={19} />
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-3 py-3">
          {NAV.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-[var(--radius-control)] px-3 py-2.5 text-[14px]",
                  "transition-colors duration-[var(--dur-fast)]",
                  active
                    ? "bg-ink font-medium text-on-brand"
                    : "font-medium text-body hover:bg-surface-warm hover:text-ink",
                )}
              >
                <Icon
                  className={cn("h-[17px] w-[17px]", active ? "text-on-brand" : "text-muted")}
                  strokeWidth={2}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3">
          <Link
            href="/app/settings"
            className={cn(
              "flex items-center gap-2.5 rounded-[var(--radius-control)] px-3 py-2.5 text-[14px] transition-colors duration-[var(--dur-fast)]",
              isActive("/app/settings")
                ? "bg-surface-warm font-medium text-ink"
                : "text-body hover:bg-surface-warm hover:text-ink",
            )}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[10.5px] font-semibold text-on-brand">
              {initial}
            </span>
            <span className="truncate">{profile.displayName || "Settings"}</span>
          </Link>
        </div>
      </aside>

      <main className="mx-auto max-w-[1180px] px-5 pb-28 pt-8 md:ml-[236px] md:max-w-none md:px-10 md:pb-20 md:pt-10 lg:px-14">
        <PageTransition>{children}</PageTransition>
      </main>

      {/* Mobile tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-canvas/95 backdrop-blur-md md:hidden">
        <div className="flex justify-around px-2 py-1.5">
          {NAV.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-[10px] px-3 py-1.5 text-[11px] font-medium transition-colors",
                  active ? "text-brand" : "text-muted",
                )}
              >
                <Icon className="h-[19px] w-[19px]" strokeWidth={2} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
