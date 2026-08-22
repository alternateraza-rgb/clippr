import { createBrowserClient } from "@supabase/ssr";
import { hasSupabase } from "@/lib/config";

export function createBrowserSupabase() {
  if (!hasSupabase()) return null;
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
