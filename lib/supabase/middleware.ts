import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_HINT_COOKIE } from "@/lib/supabase/session-hint";
import { billingEnforced } from "@/lib/config";
import { hasAccess, readSubscription } from "@/lib/billing/subscription";

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  return to;
}

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isApp = path.startsWith("/app");
  const isAuth = path === "/login" || path === "/signup";
  const isOnboarding = path.startsWith("/onboarding");

  // Only written when it actually changes, so the vast majority of responses
  // carry no Set-Cookie of ours and stay as cacheable as they were.
  const hinted = request.cookies.get(SESSION_HINT_COOKIE)?.value === "1";
  const setHint = (target: NextResponse) => {
    if (user && !hinted) {
      target.cookies.set(SESSION_HINT_COOKIE, "1", {
        httpOnly: false,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    } else if (!user && hinted) {
      target.cookies.set(SESSION_HINT_COOKIE, "", { path: "/", maxAge: 0 });
    }
    return target;
  };

  const bounce = (pathname: string) => {
    const redirect = request.nextUrl.clone();
    redirect.pathname = pathname;
    redirect.search = "";
    return setHint(copyCookies(response, NextResponse.redirect(redirect)));
  };

  if ((isApp || isOnboarding) && !user) {
    return bounce("/login");
  }

  // No profile lookup here: /app runs the same check on the very next hop, and
  // doing it twice put two round trips between the click and the dashboard.
  if (user && isAuth) {
    return bounce("/app");
  }

  if (user && isApp) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_complete")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile || profile.onboarding_complete === false) {
      return bounce("/onboarding");
    }

    // Onboarding first, then payment. Someone who has not finished telling us
    // their niche should not be looking at a card form.
    if (billingEnforced()) {
      const subscription = await readSubscription(user.id);
      if (!hasAccess(subscription)) return bounce("/checkout");
    }
  }

  return setHint(response);
}
