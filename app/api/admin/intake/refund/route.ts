import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { isAttorney, getUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { originAllowed, requestIp } from "@/lib/rate-limit";
import { getStripe } from "@/lib/stripe";
import { sendRefundConfirmation } from "@/lib/email";
import type { PaymentMethod } from "@/lib/flow-data";

export const runtime = "nodejs";

// POST /api/admin/intake/refund
// body: { reference, reason? }
//
// For card payments: calls Stripe.refunds.create with the original
// payment_intent. For Zelle/cash: just flips the status — the actual money
// movement is manual (attorney sends Zelle/check; the email tells the
// client to expect it). Either way we record it as 'refunded'.
export async function POST(req: Request) {
  if (!originAllowed(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await isAttorney())) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const reference = typeof body?.reference === "string" ? body.reference : null;
  const reason = typeof body?.reason === "string" ? body.reason.slice(0, 500) : undefined;
  if (!reference || !/^MS-\d{6}$/.test(reference)) {
    return NextResponse.json({ error: "invalid reference" }, { status: 400 });
  }

  const sb = getAdminSupabase();
  const { data: intake, error } = await sb
    .from("intakes")
    .select("id, payment_method, payment_status, stripe_payment_intent, amount_cents, client_email, client_name")
    .eq("reference", reference)
    .maybeSingle();

  if (error || !intake) return NextResponse.json({ error: "not found" }, { status: 404 });

  let stripeRefundId: string | null = null;
  if (intake.payment_method === "card" && intake.payment_status === "paid") {
    if (!intake.stripe_payment_intent) {
      return NextResponse.json({ error: "no payment intent on file" }, { status: 422 });
    }
    try {
      const refund = await getStripe().refunds.create({
        payment_intent: intake.stripe_payment_intent,
        reason: "requested_by_customer",
      });
      stripeRefundId = refund.id;
    } catch (e) {
      return NextResponse.json({ error: `stripe: ${(e as Error).message}` }, { status: 502 });
    }
  }

  const { error: updErr } = await sb
    .from("intakes")
    .update({
      payment_status: "refunded",
      attorney_notes: reason ?? null,
    })
    .eq("id", intake.id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await logAudit({
    action: "intake.refund",
    actorId: user.id,
    actorEmail: user.email,
    ip: requestIp(req.headers),
    resource: `intake:${reference}`,
    metadata: {
      method: intake.payment_method,
      amount_cents: intake.amount_cents,
      stripe_refund_id: stripeRefundId,
      reason,
    },
  });

  if (intake.client_email) {
    try {
      await sendRefundConfirmation({
        to: intake.client_email as string,
        clientName: (intake.client_name as string) ?? "",
        reference,
        amountUsd: ((intake.amount_cents as number) ?? 0) / 100,
        method: (intake.payment_method ?? "card") as PaymentMethod,
        reason,
      });
    } catch (e) {
      console.error("refund email failed", e);
    }
  }

  return NextResponse.json({ ok: true, stripeRefundId });
}
