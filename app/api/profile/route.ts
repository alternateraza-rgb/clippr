import { hasSupabase } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/agent/types";

function emptyProfile(displayName = ""): Profile {
  return {
    displayName,
    platforms: ["youtube"],
    niche: "finance",
    interests: [],
    nicheSource: "manual",
    captionPreset: "hormozi",
    defaultGameplay: "minecraft",
    onboardingComplete: false,
  };
}

function fromRow(data: {
  display_name?: string | null;
  platforms?: Profile["platforms"] | null;
  niche?: Profile["niche"] | null;
  interests?: string[] | null;
  niche_source?: Profile["nicheSource"] | null;
  caption_preset?: Profile["captionPreset"] | null;
  default_gameplay?: Profile["defaultGameplay"] | null;
  onboarding_complete?: boolean | null;
}, displayName = ""): Profile {
  const fallback = emptyProfile(displayName);
  return {
    displayName: data.display_name || fallback.displayName,
    platforms: data.platforms?.length ? data.platforms : fallback.platforms,
    niche: data.niche ?? fallback.niche,
    interests: data.interests ?? fallback.interests,
    nicheSource: data.niche_source ?? fallback.nicheSource,
    captionPreset: data.caption_preset ?? fallback.captionPreset,
    defaultGameplay: data.default_gameplay ?? fallback.defaultGameplay,
    onboardingComplete: Boolean(data.onboarding_complete),
  };
}

export async function GET() {
  if (!hasSupabase()) return Response.json({ profile: null, auth: false });
  const supabase = await createClient();
  if (!supabase) return Response.json({ profile: null, auth: false });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ profile: null, auth: false });
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const displayName =
    (user.user_metadata?.display_name as string | undefined) ||
    (user.user_metadata?.full_name as string | undefined) ||
    "";
  if (!data) return Response.json({ profile: emptyProfile(displayName), auth: true });
  return Response.json({ profile: fromRow(data, displayName), auth: true });
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
