import { env } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export async function getSessionUser() {
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export function isCronRequest(request: Request) {
  const secret = env("CRON_SECRET");
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}
