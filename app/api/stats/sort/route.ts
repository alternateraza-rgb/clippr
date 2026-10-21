import { getSessionUser } from "@/lib/auth/session";
import { asGenre } from "@/lib/fixtures/niches";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { classifyUnsortedReels } from "@/lib/stats/genre";

export const runtime = "nodejs";

/**
 * Sorts a batch of the user's older reels into genres. Stats calls this while
 * it is open, so a library made before genres existed fills itself in instead
 * of waiting on someone to run the backfill script.
 */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return Response.json({ sorted: 0 }, { status: 401 });

  const supabase = createAdminClient() ?? (await createClient());
  if (!supabase) return Response.json({ sorted: 0 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("niche")
    .eq("id", user.id)
    .maybeSingle();

  const sorted = await classifyUnsortedReels(supabase, user.id, {
    limit: 50,
    fallback: asGenre(profile?.niche),
  });
  return Response.json({ sorted });
}
