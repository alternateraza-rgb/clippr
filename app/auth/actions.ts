"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasSupabase } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { siteOrigin } from "@/lib/supabase/origin";

export type AuthState = {
  error?: string;
  checkEmail?: boolean;
};

function go(path: string): never {
  revalidatePath("/", "layout");
  redirect(path);
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!hasSupabase()) go("/app");
  const supabase = await createClient();
  if (!supabase) go("/app");

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter an email and password." };

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  if (!data.user) return { error: "Could not sign in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("id", data.user.id)
    .maybeSingle();

  go(!profile || profile.onboarding_complete === false ? "/onboarding" : "/app");
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!hasSupabase()) go("/onboarding");
  const supabase = await createClient();
  if (!supabase) go("/onboarding");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter an email and password." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };

  const origin = await siteOrigin();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: name },
      emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
    },
  });
  if (error) return { error: error.message };

  if (data.user && !data.session && (data.user.identities?.length ?? 0) === 0) {
    return { error: "An account with this email already exists. Log in instead." };
  }

  if (!data.session) {
    return { checkEmail: true };
  }

  go("/onboarding");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
