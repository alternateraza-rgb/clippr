import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/config";
import type { Profile } from "@/lib/agent/types";
import { DEFAULT_PROFILE } from "@/lib/fixtures/profile";

export async function GET() {
  if (!hasSupabase()) return Response.json({ profile: null, auth: false });
  const supabase = await createClient();
  if (!supabase) return Response.json({ profile: null, auth: false });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ profile: null, auth: false });
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!data) return Response.json({ profile: DEFAULT_PROFILE, auth: true });
  const profile: Profile = {
    displayName: data.display_name || DEFAULT_PROFILE.displayName,
    platforms: data.platforms ?? DEFAULT_PROFILE.platforms,
    niche: data.niche ?? DEFAULT_PROFILE.niche,
    interests: data.interests ?? DEFAULT_PROFILE.interests,
    nicheSource: data.niche_source ?? DEFAULT_PROFILE.nicheSource,
    captionPreset: data.caption_preset ?? DEFAULT_PROFILE.captionPreset,
    defaultGameplay: data.default_gameplay ?? DEFAULT_PROFILE.defaultGameplay,
    onboardingComplete: Boolean(data.onboarding_complete),
  };
  return Response.json({ profile, auth: true });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as Profile;
  if (!hasSupabase()) return Response.json({ ok: true, persisted: false });
  const supabase = await createClient();
  if (!supabase) return Response.json({ ok: true, persisted: false });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ ok: true, persisted: false });
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    display_name: body.displayName,
    platforms: body.platforms,
    niche: body.niche,
    interests: body.interests,
    niche_source: body.nicheSource,
    caption_preset: body.captionPreset,
    default_gameplay: body.defaultGameplay,
    onboarding_complete: body.onboardingComplete,
  });
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json({ ok: true, persisted: true });
}
