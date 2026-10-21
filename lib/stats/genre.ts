import type { SupabaseClient } from "@supabase/supabase-js";
import { hasLlm } from "@/lib/config";
import { asGenre, GENRE_IDS, NICHES } from "@/lib/fixtures/niches";
import { completeJson } from "@/lib/llm/complete";
import type { ClipCandidate, Niche } from "@/lib/agent/types";

/**
 * How many reels go to the model in one call. Each one is a title and two short
 * lines, so this is a small prompt — the cap is there so one answer that comes
 * back malformed costs a retry of 25, not of a whole library.
 */
const BATCH = 25;

const SYSTEM = `You sort short video clips into genres.

For each clip you get its topic, its opening line, and the longform video it was cut from. Pick the ONE genre the clip itself belongs to — judge by what the clip is about, not by the channel it came from. A finance podcast clip about a workout routine is fitness.

Genres:
${NICHES.map((n) => `- ${n.id}: ${n.label}`).join("\n")}

Use "podcasts" only for clips whose appeal is the conversation itself and that fit no subject genre.

Respond with JSON: {"genres":[{"n":1,"genre":"finance"}]} — one entry per clip, by its number.`;

const SCHEMA = {
  name: "genres",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["genres"],
    properties: {
      genres: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["n", "genre"],
          properties: {
            n: { type: "number" },
            genre: { type: "string", enum: GENRE_IDS },
          },
        },
      },
    },
  },
};

type Unsorted = {
  id: string;
  video_id: string;
  moment: ClipCandidate | null;
};

/**
 * Gives a genre to one user's reels that don't have one yet, and returns how
 * many it sorted.
 *
 * This is how reels made before genres existed get onboarded: Stats calls it
 * when it opens, so the page fills itself in, and scripts/backfill-genres.ts
 * calls it in a loop for everyone at once.
 *
 * Takes the client rather than making one so it runs the same from a route
 * (session cookies) and from a CLI (service role, no request at all).
 */
export async function classifyUnsortedReels(
  supabase: SupabaseClient,
  userId: string,
  opts?: { limit?: number; fallback?: Niche },
): Promise<number> {
  const { data } = await supabase
    .from("clip_renders")
    .select("id, video_id, moment")
    .eq("user_id", userId)
    .is("genre", null)
    .neq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? BATCH);
  const rows = (data ?? []) as Unsorted[];
  if (!rows.length) return 0;

  const assigned = new Map<string, Niche>();

  for (const row of rows) {
    // A candidate scored after genres were added already knows its own. This
    // only happens for reels rendered from a cached analysis older than that.
    const own = asGenre(row.moment?.genre);
    if (own) assigned.set(row.id, own);
  }

  const rest = rows.filter((r) => !assigned.has(r.id));
  if (rest.length) {
    if (hasLlm()) {
      const videos = await videoLines(supabase, rest.map((r) => r.video_id));
      for (let i = 0; i < rest.length; i += BATCH) {
        const chunk = rest.slice(i, i + BATCH);
        // A failed call leaves these unsorted, and the next visit tries again.
        // Writing the user's niche here instead would make a guess permanent.
        const answer = await askModel(chunk, videos).catch((err) => {
          console.warn("[stats] genre classification failed:", (err as Error).message);
          return null;
        });
        if (!answer) continue;
        chunk.forEach((row, idx) => {
          const genre = answer.get(idx + 1);
          if (genre) assigned.set(row.id, genre);
        });
      }
    } else if (opts?.fallback) {
      // No model configured at all, so there is nothing to wait for. The
      // user's own niche is the best guess there is.
      for (const row of rest) assigned.set(row.id, opts.fallback);
    }
  }

  // One update per genre rather than one per reel.
  const byGenre = new Map<Niche, string[]>();
  for (const [id, genre] of assigned) {
    byGenre.set(genre, [...(byGenre.get(genre) ?? []), id]);
  }
  let written = 0;
  for (const [genre, ids] of byGenre) {
    const { error } = await supabase
      .from("clip_renders")
      .update({ genre })
      .eq("user_id", userId)
      .in("id", ids);
    if (!error) written += ids.length;
  }
  return written;
}

async function videoLines(supabase: SupabaseClient, videoIds: string[]) {
  const { data } = await supabase
    .from("video_cache")
    .select("video_id, title, channel")
    .in("video_id", [...new Set(videoIds)]);
  const out = new Map<string, string>();
  for (const row of (data ?? []) as { video_id: string; title: string; channel: string }[]) {
    out.set(row.video_id, `${row.title} — ${row.channel}`);
  }
  return out;
}

async function askModel(rows: Unsorted[], videos: Map<string, string>) {
  const user = rows
    .map((row, i) => {
      const lines = [
        `${i + 1}.`,
        `topic: ${row.moment?.topic || "(none)"}`,
        `opens on: ${row.moment?.hook || "(none)"}`,
        `from: ${videos.get(row.video_id) || "(unknown video)"}`,
      ];
      return lines.join("\n   ");
    })
    .join("\n\n");

  const { text } = await completeJson({
    system: SYSTEM,
    user,
    schema: SCHEMA,
    maxTokens: 60 + rows.length * 24,
    temperature: 0,
  });
  const parsed = JSON.parse(text) as { genres?: { n?: unknown; genre?: unknown }[] };
  const out = new Map<number, Niche>();
  for (const item of parsed.genres ?? []) {
    const genre = asGenre(item.genre);
    if (typeof item.n === "number" && genre) out.set(item.n, genre);
  }
  return out;
}
