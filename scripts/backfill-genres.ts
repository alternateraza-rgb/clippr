import "../lib/load-env";
import { createAdminClient } from "../lib/supabase/admin";
import { asGenre } from "../lib/fixtures/niches";
import { classifyUnsortedReels } from "../lib/stats/genre";

/**
 * Gives every existing reel a genre, for every user, in one go.
 *
 * Stats already does this lazily for whoever opens it; this is for filling the
 * whole table at once — after applying 009, say. Safe to re-run: it only ever
 * touches reels whose genre is still null.
 *
 *   npx tsx scripts/backfill-genres.ts            # do it
 *   npx tsx scripts/backfill-genres.ts --dry-run  # count what would be sorted
 */
async function main() {
  const dry = process.argv.includes("--dry-run");
  const supabase = createAdminClient();
  if (!supabase) {
    console.error("[genres] SUPABASE_SERVICE_ROLE_KEY missing — add it to .env.local");
    process.exit(1);
  }

  const { data, error } = await supabase
    .from("clip_renders")
    .select("user_id")
    .is("genre", null)
    .neq("status", "failed");
  if (error) {
    console.error(`[genres] ${error.message} — has 009_reel_genre.sql been applied?`);
    process.exit(1);
  }

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { user_id: string }[]) {
    counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
  }
  console.log(`[genres] ${data?.length ?? 0} unsorted reels across ${counts.size} users`);
  if (dry || !counts.size) return;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, niche")
    .in("id", [...counts.keys()]);
  const niches = new Map(
    ((profiles ?? []) as { id: string; niche: string }[]).map((p) => [p.id, asGenre(p.niche)]),
  );

  let total = 0;
  for (const [userId, pending] of counts) {
    let done = 0;
    // A batch that sorts nothing means the model is failing for this user;
    // move on rather than asking the same question forever.
    while (done < pending) {
      const sorted = await classifyUnsortedReels(supabase, userId, {
        limit: 25,
        fallback: niches.get(userId),
      });
      if (!sorted) break;
      done += sorted;
    }
    total += done;
    console.log(`[genres] ${userId.slice(0, 8)}… ${done}/${pending}`);
  }
  console.log(`[genres] sorted ${total} reels`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
