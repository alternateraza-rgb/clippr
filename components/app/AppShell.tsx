"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderOpen,
  Home,
  type LucideIcon,
  Scissors,
  Sparkles,
} from "lucide-react";
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
  const initial = profile.displayName.slice(0, 1).toUpperCase();

  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname.startsWith(href);

  return (
    <div className="workspace min-h-screen bg-canvas">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-hairline bg-surface px-4 md:hidden">
        <Wordmark href="/app" />
        <Link
          href="/app/settings"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[12px] font-medium text-on-brand"
          aria-label="Settings"
        >
          {initial}
        </Link>
      </header>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[228px] flex-col border-r border-hairline bg-surface md:flex">
        <div className="flex h-14 items-center border-b border-hairline px-5">
          <Wordmark href="/app" />
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {NAV.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-[13.5px] transition-colors",
                  active
                    ? "bg-surface-warm text-ink font-medium"
                    : "text-muted hover:bg-surface-warm hover:text-ink",
                )}
              >
                <Icon className="h-[17px] w-[17px]" strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-hairline p-3">
          <Link
            href="/app/settings"
            className={cn(
              "flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-[13.5px] transition-colors",
              isActive("/app/settings")
                ? "bg-surface-warm text-ink font-medium"
                : "text-muted hover:bg-surface-warm hover:text-ink",
            )}
          >
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-ink text-[10px] font-medium text-on-brand">
              {initial}
            </span>
            {profile.displayName || "Settings"}
          </Link>
        </div>
      </aside>

      <main className="mx-auto max-w-[1120px] px-5 pb-24 pt-8 md:ml-[228px] md:max-w-none md:px-10 md:pb-16 md:pt-10">
        <PageTransition>{children}</PageTransition>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-surface md:hidden">
        <div className="flex justify-around px-2 py-2">
          {NAV.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-[8px] px-3 py-1.5 text-[11px]",
                  active ? "text-ink" : "text-muted",
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
