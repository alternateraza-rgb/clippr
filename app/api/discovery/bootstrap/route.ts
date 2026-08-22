import { bootstrapUserFeed } from "@/lib/discovery";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Niche, Platform } from "@/lib/agent/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ message: "Sign in first." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    niche?: Niche;
    interests?: string[];
    platforms?: Platform[];
  };

  let niche = body.niche;
  let formats = body.interests;
  let platforms = body.platforms;

  if (!niche) {
    const supabase = await createClient();
    if (supabase) {
      const { data } = await supabase
        .from("profiles")
        .select("niche, interests, platforms")
        .eq("id", user.id)
        .maybeSingle();
      niche = (data?.niche as Niche | undefined) ?? "finance";
      formats = formats ?? (data?.interests as string[] | undefined);
      platforms = platforms ?? (data?.platforms as Platform[] | undefined);
    } else {
      niche = "finance";
    }
  }

  const result = await bootstrapUserFeed({
    userId: user.id,
    niche,
    formats,
    platforms,
  });
  return Response.json(result);
}
