"use client";

import { useEffect, useMemo, useState } from "react";
import { PasswordCard } from "@/components/app/PasswordCard";
import { PageHeader } from "@/components/app/PageHeader";
import { SettingsRow, SettingsSection } from "@/components/app/SettingsSection";
import { StatTile } from "@/components/app/StatTile";
import { Chip, Tag } from "@/components/ui/Chip";
import { Pill } from "@/components/ui/Pill";
import { TextInput } from "@/components/ui/TextInput";
import { signOut } from "@/app/auth/actions";
import { LEGAL_CONTACT } from "@/lib/legal";
import { FORMATS, NICHES } from "@/lib/fixtures/niches";
import { CAPTION_PRESETS, GAMEPLAY_TRACKS } from "@/lib/fixtures/presets";
import { useRenders } from "@/lib/hooks/useRenders";
import { useProfile } from "@/lib/store/profile";
import type { CaptionPreset, GameplayTrack, Niche, Platform } from "@/lib/agent/types";

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: "youtube", label: "YouTube Shorts" },
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Reels" },
];

type Account = { email: string; createdAt: string; hasPassword: boolean };
type Billing = {
  enforced: boolean;
  access: boolean;
  status: string;
  currentPeriodEnd?: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  trialing: "Trial",
  canceling: "Cancels at period end",
  past_due: "Payment failed",
  canceled: "Cancelled",
  expired: "Expired",
  none: "No plan",
};

export default function SettingsPage() {
  const { profile, setProfile } = useProfile();
  // Counts and durations only — no signed download links needed here.
  const { renders } = useRenders({ withUrls: false });
  const [account, setAccount] = useState<Account | null>(null);
  const [authEnabled, setAuthEnabled] = useState(false);
  const [billing, setBilling] = useState<Billing | null>(null);

  useEffect(() => {
    fetch("/api/account")
      .then((r) => r.json())
      .then((d: { account?: Account | null; authEnabled?: boolean }) => {
        setAccount(d.account ?? null);
        setAuthEnabled(Boolean(d.authEnabled));
      })
      .catch(() => null);

    fetch("/api/billing/status")
      .then((r) => r.json())
      .then(setBilling)
      .catch(() => null);
  }, []);

  const stats = useMemo(() => {
    const ready = renders.filter((r) => r.status === "ready");
    const now = new Date();
    const thisMonth = ready.filter((r) => {
      const at = new Date(r.createdAt);
      return at.getMonth() === now.getMonth() && at.getFullYear() === now.getFullYear();
    });
    const seconds = ready.reduce((total, r) => total + (r.durationS ?? 0), 0);
    return {
      total: ready.length,
      thisMonth: thisMonth.length,
      minutes: Math.round(seconds / 60),
    };
  }, [renders]);

  const joined = account?.createdAt
    ? new Date(account.createdAt).toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      })
    : "—";

  function togglePlatform(id: Platform) {
    const next = profile.platforms.includes(id)
      ? profile.platforms.filter((p) => p !== id)
      : [...profile.platforms, id];
    setProfile({ ...profile, platforms: next.length ? next : [id] });
  }

  function toggleFormat(id: string) {
    const interests = profile.interests.includes(id)
      ? profile.interests.filter((i) => i !== id)
      : [...profile.interests, id];
    setProfile({ ...profile, interests });
  }

  return (
    <div className="max-w-[820px] pb-4">
      <PageHeader
        eyebrow="Settings"
        title="Your account"
        lede="Your details, your plan, and the defaults every new clip starts from."
      />

      <div className="mt-9 grid gap-px overflow-hidden rounded-card bg-hairline sm:grid-cols-3">
        <StatTile value={stats.total} label="Clips created" hint="Finished and downloadable" />
        <StatTile value={stats.thisMonth} label="This month" hint="Since the 1st" />
        <StatTile
          value={stats.minutes}
          label="Minutes cut"
          hint="Total length of your clips"
        />
      </div>

      <div className="mt-10">
        <SettingsSection
          title="Account"
          description="How you sign in. Changing your password signs out your other devices."
        >
          <div className="divide-y divide-hairline">
            <SettingsRow
              label="Email"
              value={account?.email || (authEnabled ? "Loading…" : "Not signed in")}
            />
            <SettingsRow label="Member since" value={joined} />
            <div className="py-3 last:pb-0">
              {authEnabled && account?.hasPassword ? (
                <PasswordCard email={account.email} />
              ) : (
                <div>
                  <p className="text-caption text-muted">Password</p>
                  <p className="mt-0.5 text-base text-body">
                    {authEnabled
                      ? "You signed in without a password, so there's nothing to change here."
                      : "Sign in to manage your password."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          title="Plan"
          description="Unlimited clips, billed monthly."
        >
          <div className="rounded-card bg-surface p-5 shadow-hairline">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-semibold text-ink">Unlimited</p>
                  {/* Only claimed once billing is wired and the webhook has
                      actually told us. Off, this stays silent rather than
                      asserting a state nothing tracks. */}
                  {billing?.enforced ? (
                    <Tag tone={billing.access ? "success" : "warn"}>
                      {STATUS_LABEL[billing.status] ?? billing.status}
                    </Tag>
                  ) : null}
                </div>
                <p className="mt-1.5 text-base text-body">
                  Unlimited generations, the full edit, and your library kept.
                </p>
                {billing?.currentPeriodEnd ? (
                  <p className="mt-1.5 text-sm text-muted">
                    {billing.status === "canceling" ? "Access until " : "Renews "}
                    {new Date(billing.currentPeriodEnd).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                ) : null}
              </div>
              <p className="display shrink-0 text-d3 text-ink">
                $150
                <span className="text-base font-normal text-muted"> / mo</span>
              </p>
            </div>
            <p className="mt-5 border-t border-hairline pt-4 text-sm text-muted">
              To change or cancel your plan, email{" "}
              <a
                href={`mailto:${LEGAL_CONTACT}`}
                className="text-brand underline-offset-4 hover:underline"
              >
                {LEGAL_CONTACT}
              </a>
              . Cancelling stops the next charge and you keep access to the end of
              the month you already paid for.
            </p>
          </div>
        </SettingsSection>

        <SettingsSection
          title="Profile"
          description="The name we greet you with."
        >
          <TextInput
            value={profile.displayName}
            onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
            placeholder="Your name"
            aria-label="Display name"
            className="max-w-[340px]"
          />
        </SettingsSection>

        <SettingsSection
          title="Your niche"
          description="What Ideas goes looking for each morning."
        >
          <div className="flex flex-wrap gap-2">
            {NICHES.map((n) => (
              <Chip
                key={n.id}
                selected={profile.niche === n.id}
                onClick={() => setProfile({ ...profile, niche: n.id as Niche })}
              >
                {n.label}
              </Chip>
            ))}
          </div>
        </SettingsSection>

        <SettingsSection
          title="Where you post"
          description="Used to pick aspect ratio and length defaults."
        >
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <Chip
                key={p.id}
                selected={profile.platforms.includes(p.id)}
                onClick={() => togglePlatform(p.id)}
              >
                {p.label}
              </Chip>
            ))}
          </div>
        </SettingsSection>

        <SettingsSection
          title="Formats you like"
          description="Nudges which moments get picked out of a video."
        >
          <div className="flex flex-wrap gap-2">
            {FORMATS.map((f) => (
              <Chip
                key={f.id}
                selected={profile.interests.includes(f.id)}
                onClick={() => toggleFormat(f.id)}
              >
                {f.label}
              </Chip>
            ))}
          </div>
        </SettingsSection>

        <SettingsSection
          title="Caption style"
          description="Burned into every clip you make."
        >
          <div className="grid gap-2.5">
            {CAPTION_PRESETS.map((preset) => (
              <ChoiceRow
                key={preset.id}
                label={preset.label}
                detail={preset.detail}
                selected={profile.captionPreset === preset.id}
                onSelect={() =>
                  setProfile({ ...profile, captionPreset: preset.id as CaptionPreset })
                }
              />
            ))}
          </div>
        </SettingsSection>

        <SettingsSection
          title="Background footage"
          description="Optional filler under the speaker, to hold attention."
        >
          <div className="grid gap-2.5">
            {GAMEPLAY_TRACKS.map((track) => (
              <ChoiceRow
                key={track.id}
                label={track.label}
                detail={track.detail}
                selected={profile.defaultGameplay === track.id}
                onSelect={() =>
                  setProfile({ ...profile, defaultGameplay: track.id as GameplayTrack })
                }
              />
            ))}
          </div>
        </SettingsSection>

        <SettingsSection title="Session" description="Sign out on this device.">
          <Pill variant="outline" onClick={() => void signOut()}>
            Sign out
          </Pill>
        </SettingsSection>
      </div>
    </div>
  );
}

/** A radio in everything but markup — label, one line of why, a selected state. */
function ChoiceRow({
  label,
  detail,
  selected,
  onSelect,
}: {
  label: string;
  detail: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-full items-start gap-3 rounded-control px-4 py-3 text-left transition-colors duration-[var(--dur-fast)] ${
        selected
          ? "bg-surface shadow-[inset_0_0_0_1.5px_var(--color-ink)]"
          : "bg-surface shadow-[inset_0_0_0_1px_var(--color-hairline)] hover:bg-surface-warm"
      }`}
    >
      <span
        className={`mt-[3px] flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full transition-colors ${
          selected ? "bg-ink" : "shadow-[inset_0_0_0_1.5px_var(--color-hairline-strong)]"
        }`}
      >
        {selected ? <span className="h-[5px] w-[5px] rounded-full bg-canvas" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block text-base font-medium text-ink">{label}</span>
        <span className="mt-0.5 block text-sm text-muted">{detail}</span>
      </span>
    </button>
  );
}
