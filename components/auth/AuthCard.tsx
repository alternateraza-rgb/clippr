"use client";

import { Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { login, signup, type AuthState } from "@/app/auth/actions";
import { AuthShell } from "@/components/auth/AuthShell";
import { Pill } from "@/components/ui/Pill";
import { hasSupabase } from "@/lib/config";
import { useProfile } from "@/lib/store/profile";

const INITIAL: AuthState = {};

export function AuthCard({
  title,
  subtitle,
  action,
  href,
  showName,
  footer,
}: {
  title: string;
  subtitle: string;
  action: string;
  href: string;
  showName?: boolean;
  footer: React.ReactNode;
}) {
  const { profile, setProfile } = useProfile();
  const [name, setName] = useState(profile.displayName);
  const authEnabled = hasSupabase();
  const [state, formAction, pending] = useActionState(
    showName ? signup : login,
    INITIAL,
  );

  if (state.checkEmail) {
    return (
      <AuthShell title="Check your email." subtitle="Confirm the link we sent, then you’ll land in onboarding.">
        <p className="mt-8 text-[14px] text-muted">{footer}</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={title} subtitle={subtitle}>
      <form
        className="mt-8 space-y-2.5"
        action={formAction}
        onSubmit={() => {
          if (showName && name.trim()) {
            void setProfile({ ...profile, displayName: name.trim() });
          }
        }}
      >
        {showName ? (
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
            className="w-full rounded-[var(--radius-pill)] bg-surface px-5 py-3.5 text-[15px] text-ink outline-none shadow-[inset_0_0_0_1px_var(--color-hairline)] transition-shadow placeholder:text-muted focus:shadow-[inset_0_0_0_1.5px_var(--color-ink)]"
          />
        ) : null}
        <input
          type="email"
          name="email"
          required={authEnabled}
          autoComplete="email"
          placeholder="Email"
          className="w-full rounded-[var(--radius-pill)] bg-surface px-5 py-3.5 text-[15px] text-ink outline-none shadow-[inset_0_0_0_1px_var(--color-hairline)] transition-shadow placeholder:text-muted focus:shadow-[inset_0_0_0_1.5px_var(--color-ink)]"
        />
        <input
          type="password"
          name="password"
          required={authEnabled}
          autoComplete={showName ? "new-password" : "current-password"}
          placeholder="Password"
          minLength={authEnabled ? 6 : undefined}
          className="w-full rounded-[var(--radius-pill)] bg-surface px-5 py-3.5 text-[15px] text-ink outline-none shadow-[inset_0_0_0_1px_var(--color-hairline)] transition-shadow placeholder:text-muted focus:shadow-[inset_0_0_0_1.5px_var(--color-ink)]"
        />
        {state.error ? (
          <ErrorLine>{state.error}</ErrorLine>
        ) : (
          /* Read on the client so /login stays a prerendered route — a page the
             server has to build per-request can't be prefetched, which is what
             made the nav button feel dead until the server answered. */
          <Suspense fallback={null}>
            <CallbackError />
          </Suspense>
        )}
        {!authEnabled ? (
          <input type="hidden" name="demo" value="1" />
        ) : null}
        <Pill type="submit" size="lg" className="mt-5 w-full" loading={pending}>
          {action}
        </Pill>
      </form>
      {!authEnabled ? (
        <p className="mt-4 text-[13px] text-muted">
          Auth is off in this environment — continue goes straight to {href}.
        </p>
      ) : null}
      <p className="mt-8 text-[14px] text-muted">{footer}</p>
    </AuthShell>
  );
}

function ErrorLine({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] text-brand">{children}</p>;
}

/** Supabase's callback and confirm routes bounce failures back as ?error=. */
function CallbackError() {
  const error = useSearchParams().get("error");
  return error ? <ErrorLine>{error}</ErrorLine> : null;
}
