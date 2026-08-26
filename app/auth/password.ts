"use server";

import { hasSupabase } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { siteOrigin } from "@/lib/supabase/origin";

export type PasswordState = { error?: string; done?: string };

/**
 * Changes the password of whoever is signed in. Supabase re-checks the session
 * server-side, so this cannot be pointed at another account by editing the
 * form.
 */
export async function changePassword(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  if (!hasSupabase()) return { error: "Accounts aren't available on this deployment." };

  const supabase = await createClient();
  if (!supabase) return { error: "Accounts aren't available on this deployment." };

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) return { error: "Use at least 8 characters." };
  if (password !== confirm) return { error: "Those two passwords don't match." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in again to change your password." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  return { done: "Password updated." };
}

/** For people who would rather do it from their inbox. */
export async function sendPasswordReset(): Promise<PasswordState> {
  if (!hasSupabase()) return { error: "Accounts aren't available on this deployment." };

  const supabase = await createClient();
  if (!supabase) return { error: "Accounts aren't available on this deployment." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Sign in again to reset your password." };

  const origin = await siteOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${origin}/auth/confirm?next=/app/settings`,
  });
  if (error) return { error: error.message };

  return { done: `Reset link sent to ${user.email}.` };
}
