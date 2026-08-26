import { hasSupabase } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in identity, for the settings header. Deliberately narrow: an
 * email, when they joined, and how they signed in. Nothing about how the
 * deployment is wired.
 */
export async function GET() {
  if (!hasSupabase()) {
    return Response.json({ account: null, authEnabled: false });
  }

  const supabase = await createClient();
  if (!supabase) return Response.json({ account: null, authEnabled: false });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ account: null, authEnabled: true });

  return Response.json({
    authEnabled: true,
    account: {
      email: user.email ?? "",
      createdAt: user.created_at,
      // "email" means a password exists to change; an OAuth-only account has
      // nothing for the password form to act on.
      hasPassword: (user.identities ?? []).some((i) => i.provider === "email"),
    },
  });
}
