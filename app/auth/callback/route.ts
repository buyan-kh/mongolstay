import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { safeNextOr } from "@/lib/safe-next";

// Email confirmation links (and OAuth callbacks) land here.
// Supabase appends ?code=... which we exchange for a session, then bounce
// the user to the `next` path (default /dashboard).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // safeNextOr rejects absolute URLs, "//host" protocol-relative, and
  // "@host" userinfo tricks that would turn `${origin}${next}` into a
  // cross-origin redirect.
  const next = safeNextOr(searchParams.get("next"), "/dashboard");

  if (code) {
    const supabase = await getServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
