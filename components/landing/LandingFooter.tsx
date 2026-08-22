import { Wordmark } from "@/components/ui/Wordmark";

export function LandingFooter() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-6 py-12 sm:flex-row sm:items-center sm:justify-between">
        <Wordmark />
        <p className="text-[13px] text-muted">
          Built for anyone who wants to make money online.
        </p>
      </div>
    </footer>
  );
}
