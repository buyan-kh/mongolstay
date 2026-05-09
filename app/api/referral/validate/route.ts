import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { originAllowed, rateLimit, requestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

// POST /api/referral/validate
//   body: { code }
//   resp: { valid: boolean, attorneyName?: string }
//
// Public endpoint. Rate-limited per IP so an attacker can't brute-force the
// code namespace (codes are short and human-typed).
export async function POST(req: Request) {
  if (!originAllowed(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const ip = requestIp(req.headers);
  if (!rateLimit("referral-validate", ip, { capacity: 30, refillPerMinute: 5 })) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const raw = typeof body?.code === "string" ? body.code.trim() : "";
  if (!raw || raw.length > 32 || !/^[A-Z0-9_-]+$/i.test(raw)) {
    return NextResponse.json({ valid: false });
  }
  const code = raw.toUpperCase();

  const sb = getAdminSupabase();
  const { data } = await sb
    .from("referral_codes")
    .select("code, attorney_name, active")
    .eq("code", code)
    .maybeSingle();

  if (!data || !data.active) return NextResponse.json({ valid: false });
  return NextResponse.json({ valid: true, attorneyName: data.attorney_name });
}
