"use client";

import { Pill } from "@/components/ui/Pill";
import { useSessionHint } from "@/lib/hooks/useSessionHint";

/**
 * The marketing CTA. Someone already signed in doesn't need the signup form —
 * sending them there only to have the proxy redirect them costs two auth round
 * trips to land where this can link them directly.
 */
export function StartCta({
  className,
  size = "md",
  children = "Start making money",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  children?: React.ReactNode;
}) {
  const signedIn = useSessionHint();

  return (
    <Pill href={signedIn ? "/app" : "/signup"} size={size} className={className}>
      {signedIn ? "Open dashboard" : children}
    </Pill>
  );
}
