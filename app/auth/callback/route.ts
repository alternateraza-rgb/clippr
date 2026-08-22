import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const origin = new URL(request.url).origin;
  const next = new URL(request.url).searchParams.get("next") ?? "/app";
  if (!supabase) {
    return NextResponse.redirect(`${origin}${next}`);
  }
  const code = new URL(request.url).searchParams.get("code");
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
