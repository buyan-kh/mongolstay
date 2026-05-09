import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getUser } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { originAllowed, requestIp } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

// POST /api/dashboard/pay/checkout
//   body: { reference }
//   resp: { url } — redirect target for Stripe Checkout
//
// Lets a signed-in client resume payment from /dashboard/[ref] when their
// original session expired or they bailed out the first time. Mints a fresh
// Stripe Checkout session and stamps it on the intake so the webhook can
// reconcile later.
export async function POST(req: Request) {
  if (!originAllowed(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const reference = typeof body?.reference === "string" ? body.reference : null;
  if (!reference || !/^MS-\d{6}$/.test(reference)) {
    return NextResponse.json({ error: "invalid reference" }, { status: 400 });
  }

  // Owner check via RLS — getServerSupabase respects the user's session.
  const userSb = await getServerSupabase();
  const { data: intake } = await userSb
    .from("intakes")
    .select("id, kind, reference, payment_status, amount_cents, client_email")
    .eq("reference", reference)
    .maybeSingle();

  if (!intake) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (intake.payment_status === "paid") {
    return NextResponse.json({ error: "already paid" }, { status: 409 });
  }
  if (intake.payment_status === "refunded") {
    return NextResponse.json({ error: "intake refunded" }, { status: 409 });
  }
  if (!intake.amount_cents || intake.amount_cents <= 0) {
    return NextResponse.json({ error: "no amount on intake" }, { status: 500 });
  }

  const origin = req.headers.get("origin") || "http://localhost:3000";
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: intake.client_email ?? user.email ?? undefined,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: intake.amount_cents,
          product_data: {
            name:
              intake.kind === "asylum"
                ? "Asylum application (I-589)"
                : "J-1 → F-1 change of status (I-539)",
            description:
              "Flat fee · attorney review included · refunded if attorneys decline case",
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/dashboard/${reference}?paid=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/dashboard/${reference}?canceled=1`,
    metadata: { kind: intake.kind, reference, intake_id: intake.id, source: "dashboard-resume" },
    payment_intent_data: {
      metadata: { kind: intake.kind, reference, intake_id: intake.id },
    },
  });

  // Stash the new session id on the intake so the webhook can match it.
  // Use admin (service role) — the user-context client cannot UPDATE intakes
  // (no RLS policy grants client-side updates).
  const admin = getAdminSupabase();
  await admin
    .from("intakes")
    .update({ stripe_session_id: session.id })
    .eq("reference", reference);

  await logAudit({
    action: "intake.submit",
    actorId: user.id,
    actorEmail: user.email,
    ip: requestIp(req.headers),
    resource: `intake:${reference}`,
    metadata: { source: "dashboard-resume", session_id: session.id },
  });

  return NextResponse.json({ url: session.url });
}
