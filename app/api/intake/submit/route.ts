import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { attachDocument, upsertIntake } from "@/lib/intake";
import { getUser } from "@/lib/auth";
import { isFlowKind, PRICES, type FlowKind, type PaymentMethod } from "@/lib/flow-data";
import { verifyTurnstile } from "@/lib/turnstile";
import { verifyStoredDocument } from "@/lib/upload-verify";
import { originAllowed, rateLimit, requestIp } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

type SchedulePayload =
  | { mode: "appointment"; iso: string; channel: "office" | "video" }
  | { mode: "callback"; window: string; note?: string }
  | { mode: null };

type DocumentPayload = {
  docId: string;
  path: string;
  originalFilename?: string;
  contentType?: string;
  sizeBytes?: number;
};

type SubmitBody = {
  kind: FlowKind;
  reference: string;
  locale?: string;
  contact: { name: string; email: string; phone: string };
  answers: Record<string, string | string[]>;
  schedule: SchedulePayload;
  documents: DocumentPayload[];
  method: PaymentMethod;
  turnstileToken?: string;
};

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  if (!originAllowed(req)) return bad("forbidden", 403);

  const ip = requestIp(req.headers);
  if (!rateLimit("intake-submit", ip, { capacity: 10, refillPerMinute: 1 })) {
    return bad("rate limited", 429);
  }

  const body = (await req.json().catch(() => null)) as SubmitBody | null;
  if (!body) return bad("invalid body");

  const { kind, reference, locale, contact, answers, schedule, documents, method, turnstileToken } = body;

  if (!isFlowKind(kind)) return bad("invalid kind");
  if (!/^MS-\d{6}$/.test(reference ?? "")) return bad("invalid reference");
  if (!contact?.name || !contact?.email || !contact?.phone) return bad("missing contact info");
  if (typeof contact.email !== "string" || !/\S+@\S+\.\S+/.test(contact.email)) return bad("invalid email");
  if (!["card", "zelle", "cash"].includes(method)) return bad("invalid method");

  // Bot check (skipped in dev when no key configured).
  const ok = await verifyTurnstile(turnstileToken, req.headers.get("x-forwarded-for"));
  if (!ok) return bad("verification failed", 403);

  // Re-verify every declared document is actually in Storage at the right
  // path with an allowed MIME type and size. Reject the entire submit if any
  // document fails — we don't want partial intakes referencing files we
  // can't trust.
  if (Array.isArray(documents)) {
    for (const d of documents) {
      if (!d?.docId || !d?.path) return bad("invalid document entry");
      const v = await verifyStoredDocument(kind, reference, d.path);
      if (!v.ok) return bad(`document verification failed: ${v.reason}`, 422);
    }
  }

  const { fee, uscisFee } = PRICES[kind];
  const amountCents = (fee + uscisFee) * 100;

  // Attach to logged-in user if any. Anonymous intakes auto-claim on signup
  // via the on_auth_user_created trigger when client_email matches.
  const user = await getUser();

  const intake = await upsertIntake({
    kind,
    reference,
    locale,
    clientUserId: user?.id ?? null,
    contact,
    answers: answers ?? {},
    schedule,
    payment: { method, amountCents },
  });

  // Attach any uploaded documents.
  if (Array.isArray(documents)) {
    for (const d of documents) {
      if (!d?.docId || !d?.path) continue;
      await attachDocument({
        intakeId: intake.id,
        docId: d.docId,
        storagePath: d.path,
        originalFilename: d.originalFilename,
        mimeType: d.contentType,
        sizeBytes: d.sizeBytes,
      });
    }
  }

  // Card → Stripe Checkout. Zelle/Cash → just return reference; webhook isn't
  // involved, attorney marks paid manually.
  await logAudit({
    action: "intake.submit",
    actorId: user?.id ?? null,
    actorEmail: user?.email ?? contact.email,
    ip: requestIp(req.headers),
    resource: `intake:${reference}`,
    metadata: { kind, method, docCount: documents?.length ?? 0 },
  });

  if (method === "card") {
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // Card includes Apple Pay + Google Pay + Link automatically when the
      // browser supports them. Pinning to ['card'] excludes Cash App Pay,
      // Klarna, Affirm — none of which fit legal flat-fee retainers.
      payment_method_types: ["card"],
      customer_email: contact.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: {
              name: kind === "asylum" ? "Asylum application (I-589)" : "J-1 → F-1 change of status (I-539)",
              description: "Flat fee · attorney review included · refunded if attorneys decline case",
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/file/${kind}/filed?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/file/${kind}/payment?canceled=1`,
      metadata: { kind, reference, intake_id: intake.id },
      payment_intent_data: { metadata: { kind, reference, intake_id: intake.id } },
    });

    // Persist the session id so webhook can match if metadata is missing.
    await upsertIntake({
      kind,
      reference,
      locale,
      clientUserId: user?.id ?? null,
      contact,
      answers: answers ?? {},
      schedule,
      payment: { method, amountCents, stripeSessionId: session.id },
    });

    return NextResponse.json({ url: session.url, reference });
  }

  return NextResponse.json({ reference });
}
