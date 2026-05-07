import "server-only";
import { getAdminSupabase } from "./supabase/admin";
import type { FlowKind, PaymentMethod } from "./flow-data";
import type { IntakeInsert } from "./supabase/types";

export type IntakeDraft = {
  kind: FlowKind;
  reference: string;
  locale?: string;
  clientUserId?: string | null;
  contact: { name: string; email: string; phone: string };
  answers: Record<string, string | string[]>;
  schedule:
    | { mode: "appointment"; iso: string; channel: "office" | "video" }
    | { mode: "callback"; window: string; note?: string }
    | { mode: null };
  payment: {
    method?: PaymentMethod;
    amountCents: number;
    stripeSessionId?: string;
  };
};

// Upserts on `reference` so retries (Stripe webhook redelivery) are idempotent.
export async function upsertIntake(draft: IntakeDraft) {
  const sb = getAdminSupabase();

  const sched = draft.schedule;
  const row: IntakeInsert = {
    kind: draft.kind,
    reference: draft.reference,
    locale: draft.locale ?? "mn",
    client_user_id: draft.clientUserId ?? null,
    client_name: draft.contact.name || null,
    client_email: draft.contact.email || null,
    client_phone: draft.contact.phone || null,
    answers: draft.answers,
    schedule_mode: sched.mode,
    appointment_at: sched.mode === "appointment" ? sched.iso : null,
    appointment_channel: sched.mode === "appointment" ? sched.channel : null,
    callback_window: sched.mode === "callback" ? sched.window : null,
    callback_note: sched.mode === "callback" ? sched.note ?? null : null,
    payment_method: draft.payment.method ?? null,
    amount_cents: draft.payment.amountCents,
    stripe_session_id: draft.payment.stripeSessionId ?? null,
    payment_status: draft.payment.method === "card" ? "pending" : "awaiting",
  };

  const { data, error } = await sb
    .from("intakes")
    .upsert(row, { onConflict: "reference" })
    .select()
    .single();

  if (error) throw new Error(`upsertIntake failed: ${error.message}`);
  return data;
}

export async function markIntakePaid(opts: {
  reference?: string;
  stripeSessionId?: string;
  stripePaymentIntent?: string;
}) {
  const sb = getAdminSupabase();
  const filter = opts.reference
    ? { reference: opts.reference }
    : { stripe_session_id: opts.stripeSessionId! };

  const { data, error } = await sb
    .from("intakes")
    .update({
      payment_status: "paid",
      paid_at: new Date().toISOString(),
      stripe_payment_intent: opts.stripePaymentIntent ?? null,
    })
    .match(filter)
    .select()
    .single();

  if (error) throw new Error(`markIntakePaid failed: ${error.message}`);
  return data;
}

export async function attachDocument(opts: {
  intakeId: string;
  docId: string;
  storagePath: string;
  originalFilename?: string;
  mimeType?: string;
  sizeBytes?: number;
}) {
  const sb = getAdminSupabase();
  const { error } = await sb.from("intake_documents").insert({
    intake_id: opts.intakeId,
    doc_id: opts.docId,
    storage_path: opts.storagePath,
    original_filename: opts.originalFilename ?? null,
    mime_type: opts.mimeType ?? null,
    size_bytes: opts.sizeBytes ?? null,
  });
  if (error) throw new Error(`attachDocument failed: ${error.message}`);
}

export async function findIntakeByReference(reference: string) {
  const sb = getAdminSupabase();
  const { data, error } = await sb
    .from("intakes")
    .select("*")
    .eq("reference", reference)
    .maybeSingle();
  if (error) throw new Error(`findIntakeByReference failed: ${error.message}`);
  return data;
}
