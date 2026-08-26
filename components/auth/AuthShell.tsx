import { Wordmark } from "@/components/ui/Wordmark";

/**
 * The frame both the real auth card and its loading fallback render into, so a
 * pending navigation lands on the finished page rather than a blank canvas.
 */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="border-b border-hairline px-6">
        <div className="mx-auto flex h-[62px] max-w-[1120px] items-center">
          <Wordmark size={20} />
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 py-14">
        <div className="w-full max-w-[400px]">
          <h1 className="display text-[clamp(32px,5vw,42px)] text-ink">{title}</h1>
          <p className="mt-3 text-[15.5px] leading-relaxed text-body">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
