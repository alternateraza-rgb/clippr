"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { changePassword, sendPasswordReset, type PasswordState } from "@/app/auth/password";
import { Pill } from "@/components/ui/Pill";

const INITIAL: PasswordState = {};

export function PasswordCard({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(changePassword, INITIAL);
  const [reset, setReset] = useState<PasswordState>({});
  const [sending, setSending] = useState(false);

  async function mailReset() {
    setSending(true);
    try {
      setReset(await sendPasswordReset());
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12.5px] text-muted">Password</p>
          <p className="mt-0.5 text-[15px] text-ink">••••••••••</p>
        </div>
        <Pill variant="outline" size="sm" onClick={() => setOpen(true)}>
          Change password
        </Pill>
      </div>
    );
  }

  return (
    <div>
      {state.done ? (
        <p className="flex items-center gap-2 rounded-[var(--radius-control)] bg-success-soft px-4 py-3 text-[14px] text-success">
          <Check className="h-4 w-4" strokeWidth={2.4} />
          {state.done}
        </p>
      ) : (
        <form action={formAction} className="space-y-2.5">
          {/* Present for password managers: they need to know which login this
              new password belongs to. */}
          <input type="hidden" name="email" value={email} autoComplete="username" />
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="New password"
            className="w-full rounded-[var(--radius-control)] bg-surface px-4 py-3 text-[15px] text-ink outline-none shadow-[inset_0_0_0_1px_var(--color-hairline)] transition-shadow placeholder:text-muted focus:shadow-[inset_0_0_0_1.5px_var(--color-ink)]"
          />
          <input
            type="password"
            name="confirm"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Confirm new password"
            className="w-full rounded-[var(--radius-control)] bg-surface px-4 py-3 text-[15px] text-ink outline-none shadow-[inset_0_0_0_1px_var(--color-hairline)] transition-shadow placeholder:text-muted focus:shadow-[inset_0_0_0_1.5px_var(--color-ink)]"
          />

          {state.error ? <p className="text-[13.5px] text-brand">{state.error}</p> : null}

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <Pill type="submit" size="sm" loading={pending}>
              Save password
            </Pill>
            <Pill variant="text" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Pill>
          </div>
        </form>
      )}

      <div className="mt-5 border-t border-hairline pt-4">
        {reset.done ? (
          <p className="text-[13.5px] text-success">{reset.done}</p>
        ) : (
          <>
            <button
              type="button"
              onClick={mailReset}
              disabled={sending}
              className="text-[13.5px] text-body underline-offset-4 transition-colors hover:text-ink hover:underline disabled:opacity-50"
            >
              {sending ? "Sending…" : "Email me a reset link instead"}
            </button>
            {reset.error ? (
              <p className="mt-2 text-[13.5px] text-brand">{reset.error}</p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
