import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { isAttorney, getUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { originAllowed, requestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

// POST /api/admin/intake/mark-filed
// body: { reference }
// Sets filed_at to now() so the client dashboard can show "Filed: <date>"
// and the progress strip can light up the final step. Re-clicking on an
// already-filed intake returns the existing filed_at unchanged.
export async function POST(req: Request) {
  if (!originAllowed(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await isAttorney())) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const reference = typeof body?.reference === "string" ? body.reference : null;
  if (!reference || !/^MS-\d{6}$/.test(reference)) {
    return NextResponse.json({ error: "invalid reference" }, { status: 400 });
  }

  const sb = getAdminSupabase();
  const { data: existing } = await sb
    .from("intakes")
    .select("id, filed_at, payment_status")
    .eq("reference", reference)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (existing.filed_at) return NextResponse.json({ ok: true, filed_at: existing.filed_at });

  const filedAt = new Date().toISOString();
  const { error } = await sb
    .from("intakes")
    .update({ filed_at: filedAt })
    .eq("reference", reference);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    action: "intake.mark_filed",
    actorId: user.id,
    actorEmail: user.email,
    ip: requestIp(req.headers),
    resource: `intake:${reference}`,
    metadata: { payment_status: existing.payment_status },
  });

  return NextResponse.json({ ok: true, filed_at: filedAt });
}
