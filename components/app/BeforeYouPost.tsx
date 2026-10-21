import { cn } from "@/lib/cn";

/**
 * Music advice, at the moment it is actionable.
 *
 * Clipmuse renders clips without a music bed on purpose, and the reason is
 * worth more to the user than the bed would be: on Shorts, a licensed track
 * moves half the revenue for that video out of the creator pool and into music
 * licensing, so a talking-head clip is better off silent. On TikTok and Reels
 * there is no equivalent split, and a rising sound is a distribution lever we
 * cannot pull from the render side.
 */
const GUIDANCE = [
  {
    platform: "YouTube Shorts",
    action: "Post it as-is.",
    why: "A licensed track sends half the revenue for that Short to music licensing instead of the creator pool. Two tracks send two thirds.",
  },
  {
    platform: "TikTok & Reels",
    action: "Add a trending sound in the app.",
    why: "Both algorithms favour early use of a rising sound, and Reels trends usually lag TikTok by a few days. That reach is free, and it can't be baked into the file.",
  },
];

export function BeforeYouPost({ className }: { className?: string }) {
  return (
    <section className={cn("text-left", className)}>
      <h2 className="eyebrow text-ink">Before you post</h2>

      <div className="mt-3.5 divide-y divide-hairline overflow-hidden rounded-card bg-surface shadow-hairline">
        {GUIDANCE.map((item) => (
          <div
            key={item.platform}
            className="grid gap-1 p-4 sm:grid-cols-[136px_1fr] sm:gap-5 sm:p-5"
          >
            <p className="text-sm font-semibold text-ink">{item.platform}</p>
            <div className="min-w-0">
              <p className="text-base text-ink">{item.action}</p>
              <p className="mt-1 text-sm text-muted">{item.why}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-caption text-muted">
        On a business or professional account, pick from the platform&apos;s commercial
        music library — the general catalogue isn&apos;t always cleared for commercial use.
      </p>
    </section>
  );
}
