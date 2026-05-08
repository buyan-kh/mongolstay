import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { findIntakeByReference, markIntakePaid } from "@/lib/intake";
import { sendAttorneyAlert, sendClientConfirmation } from "@/lib/email";
import { sendClientSmsConfirmation } from "@/lib/sms";
import type { FlowKind, PaymentMethod } from "@/lib/flow-data";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return NextResponse.json({ error: "no signature" }, { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch (e) {
    return NextResponse.json({ error: `bad signature: ${(e as Error).message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const reference = session.metadata?.reference;
    const sessionId = session.id;
    const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : null;

    try {
      const intake = await markIntakePaid({
        reference: reference || undefined,
        stripeSessionId: sessionId,
        stripePaymentIntent: paymentIntent ?? undefined,
      });

      // Re-fetch to get all fields (markIntakePaid returns the partial update).
      const full = reference ? await findIntakeByReference(reference) : intake;
      if (full && full.client_email) {
        const schedulePayload =
          full.schedule_mode === "appointment" && full.appointment_at
            ? {
                mode: "appointment" as const,
                iso: full.appointment_at as string,
                channel: (full.appointment_channel ?? "office") as "office" | "video",
              }
            : full.schedule_mode === "callback" && full.callback_window
            ? {
                mode: "callback" as const,
                window: full.callback_window as string,
              }
            : { mode: null };

        const confirmInput = {
          to: full.client_email as string,
          clientName: (full.client_name as string) ?? "",
          reference: full.reference as string,
          kind: full.kind as FlowKind,
          amountUsd: ((full.amount_cents as number) ?? 0) / 100,
          method: (full.payment_method ?? "card") as PaymentMethod,
          paid: true,
          schedule: schedulePayload,
        };

        // Don't let email/SMS failures bounce the webhook (Stripe retries 5xx).
        await Promise.allSettled([
          sendClientConfirmation(confirmInput),
          sendAttorneyAlert(confirmInput),
          full.client_phone
            ? sendClientSmsConfirmation({
                to: full.client_phone as string,
                reference: full.reference as string,
                kind: full.kind as FlowKind,
                schedule: schedulePayload,
              })
            : Promise.resolve(),
        ]);
      }
    } catch (e) {
      console.error("webhook: markIntakePaid/email failed", e);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
