"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Orb } from "@/components/motion/Orb";
import { Pill } from "@/components/ui/Pill";
import { Wordmark } from "@/components/ui/Wordmark";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useProfile } from "@/lib/store/profile";

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
  const router = useRouter();
  const { profile, setProfile } = useProfile();
  const [name, setName] = useState(profile.displayName);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [authEnabled, setAuthEnabled] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => setAuthEnabled(Boolean(d.authEnabled)))
      .catch(() => setAuthEnabled(false));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (showName && name.trim()) {
      setProfile({ ...profile, displayName: name.trim() });
    }
    if (!authEnabled) {
      router.push(href);
      return;
    }
    setPending(true);
    const supabase = createBrowserSupabase();
    if (!supabase) {
      router.push(href);
      return;
    }
    try {
      if (showName) {
        const { error: signError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: name.trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
          },
        });
        if (signError) throw signError;
        router.push("/onboarding");
      } else {
        const { error: signError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signError) throw signError;
        router.push("/app");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas">
      <Orb className="-right-20 top-10 h-[380px] w-[380px]" />
      <div className="relative mx-auto flex min-h-screen max-w-[440px] flex-col justify-center px-6 py-16">
        <Wordmark />
        <h1 className="display mt-14 text-[clamp(36px,6vw,48px)]">{title}</h1>
        <p className="mt-4 text-body">{subtitle}</p>
        <form className="mt-10 space-y-3" onSubmit={onSubmit}>
          {showName ? (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-full bg-surface px-5 py-3 text-[15px] shadow-hairline outline-none placeholder:text-muted"
            />
          ) : null}
          <input
            type="email"
            required={authEnabled}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-full bg-surface px-5 py-3 text-[15px] shadow-hairline outline-none placeholder:text-muted"
          />
          <input
            type="password"
            required={authEnabled}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            minLength={6}
            className="w-full rounded-full bg-surface px-5 py-3 text-[15px] shadow-hairline outline-none placeholder:text-muted"
          />
          {error ? <p className="text-[13px] text-brand">{error}</p> : null}
          <Pill type="submit" className="mt-4 w-full" disabled={pending}>
            {pending ? "Working…" : action}
          </Pill>
        </form>
        <p className="mt-8 text-[14px] text-muted">{footer}</p>
      </div>
    </div>
  );
}
