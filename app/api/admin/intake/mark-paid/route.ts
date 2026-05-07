import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { isAttorney, getUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { originAllowed, requestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

// POST /api/admin/intake/mark-paid
// body: { reference }
// Used for Zelle / cash intakes where Stripe webhook isn't involved.
// Attorney clicks the button after they've reconciled the payment manually.
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
  const { data, error } = await sb
    .from("intakes")
    .update({
      payment_status: "paid",
      paid_at: new Date().toISOString(),
    })
    .eq("reference", reference)
    .select("id, payment_method, amount_cents")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "not found" }, { status: 404 });
  }

  await logAudit({
    action: "intake.mark_paid",
    actorId: user.id,
    actorEmail: user.email,
    ip: requestIp(req.headers),
    resource: `intake:${reference}`,
    metadata: { method: data.payment_method, amount_cents: data.amount_cents },
  });

  return NextResponse.json({ ok: true });
}
