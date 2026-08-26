"use client";

import { StartCta } from "@/components/landing/StartCta";
import { Pill } from "@/components/ui/Pill";
import { useSessionHint } from "@/lib/hooks/useSessionHint";

/**
 * A signed-in visitor clicking "Log in" used to go /login -> proxy -> redirect
 * -> /app, two auth round trips deep, with nothing on screen the whole way.
 */
export function LandingAuthLinks() {
  const signedIn = useSessionHint();

  return (
    <>
      {signedIn ? null : (
        <Pill href="/login" variant="text" size="sm" className="hidden sm:inline-flex">
          Log in
        </Pill>
      )}
      <StartCta size="sm">Get started</StartCta>
    </>
  );
}
