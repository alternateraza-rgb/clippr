"use client";

import { useActionState, useState } from "react";
import { login, signup, type AuthState } from "@/app/auth/actions";
import { Orb } from "@/components/motion/Orb";
import { Pill } from "@/components/ui/Pill";
import { Wordmark } from "@/components/ui/Wordmark";
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
  initialError,
}: {
  title: string;
  subtitle: string;
  action: string;
  href: string;
  showName?: boolean;
  footer: React.ReactNode;
  initialError?: string;
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
      <Shell title="Check your email." subtitle="Confirm the link we sent, then you’ll land in onboarding.">
        <p className="mt-8 text-[14px] text-muted">{footer}</p>
      </Shell>
    );
  }

  return (
    <Shell title={title} subtitle={subtitle}>
      <form
        className="mt-10 space-y-3"
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
            className="w-full rounded-full bg-surface px-5 py-3 text-[15px] shadow-hairline outline-none placeholder:text-muted"
          />
        ) : null}
        <input
          type="email"
          name="email"
          required={authEnabled}
          autoComplete="email"
          placeholder="Email"
          className="w-full rounded-full bg-surface px-5 py-3 text-[15px] shadow-hairline outline-none placeholder:text-muted"
        />
        <input
          type="password"
          name="password"
          required={authEnabled}
          autoComplete={showName ? "new-password" : "current-password"}
          placeholder="Password"
          minLength={authEnabled ? 6 : undefined}
          className="w-full rounded-full bg-surface px-5 py-3 text-[15px] shadow-hairline outline-none placeholder:text-muted"
        />
        {state.error || initialError ? (
          <p className="text-[13px] text-brand">{state.error || initialError}</p>
        ) : null}
        {!authEnabled ? (
          <input type="hidden" name="demo" value="1" />
        ) : null}
        <Pill type="submit" className="mt-4 w-full" disabled={pending}>
          {pending ? "Working…" : action}
        </Pill>
      </form>
      {!authEnabled ? (
        <p className="mt-4 text-[13px] text-muted">
          Auth is off in this environment — continue goes straight to {href}.
        </p>
      ) : null}
      <p className="mt-8 text-[14px] text-muted">{footer}</p>
    </Shell>
  );
}

function Shell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas">
      <Orb className="-right-20 top-10 h-[380px] w-[380px]" />
      <div className="relative mx-auto flex min-h-screen max-w-[440px] flex-col justify-center px-6 py-16">
        <Wordmark />
        <h1 className="display mt-14 text-[clamp(36px,6vw,48px)]">{title}</h1>
        <p className="mt-4 text-body">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}
