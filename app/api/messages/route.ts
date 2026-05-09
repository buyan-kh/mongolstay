import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getServerSupabase } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { sendAttorneyMessageAlert } from "@/lib/email";
import { originAllowed, rateLimit, requestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

type Attachment = {
  storagePath: string;
  originalFilename?: string;
  contentType?: string;
  sizeBytes?: number;
};

// POST /api/messages
//   body: { reference, body, subject?, attachments?: [{ storagePath, ... }] }
//
// Lets a logged-in client post a message back to the attorney on one of
// their own intakes. Direction is forced to 'out' server-side.
export async function POST(req: Request) {
  if (!originAllowed(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const ip = requestIp(req.headers);
  if (!rateLimit("messages-post", ip, { capacity: 30, refillPerMinute: 5 })) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const reference = typeof body?.reference === "string" ? body.reference : null;
  const subject = typeof body?.subject === "string" && body.subject.trim() ? body.subject.trim().slice(0, 200) : null;
  const messageBody = typeof body?.body === "string" ? body.body.trim() : "";
  const attachments: Attachment[] = Array.isArray(body?.attachments) ? body.attachments : [];

  if (!reference || !/^MS-\d{6}$/.test(reference)) {
    return NextResponse.json({ error: "invalid reference" }, { status: 400 });
  }
  if (messageBody.length === 0 && attachments.length === 0) {
    return NextResponse.json({ error: "message empty" }, { status: 400 });
  }
  if (messageBody.length > 10_000) {
    return NextResponse.json({ error: "message too long" }, { status: 400 });
  }
  if (attachments.length > 10) {
    return NextResponse.json({ error: "too many attachments" }, { status: 400 });
  }

  // The user-context client enforces RLS — confirms this user owns the intake.
  const userClient = await getServerSupabase();
  const { data: intake } = await userClient
    .from("intakes")
    .select("id, client_email, client_name, reference")
    .eq("reference", reference)
    .maybeSingle();
  if (!intake) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Insert the message via service role so we can also write attachments
  // atomically with full visibility on row IDs.
  const admin = getAdminSupabase();
  const { data: inserted, error: insertErr } = await admin
    .from("intake_messages")
    .insert({
      intake_id: intake.id,
      direction: "out",
      subject,
      body: messageBody,
      read_at: null,
      sender_id: user.id,
    })
    .select("id")
    .single();
  if (insertErr || !inserted) {
    return NextResponse.json({ error: insertErr?.message ?? "insert failed" }, { status: 500 });
  }

  if (attachments.length > 0) {
    const rows = attachments
      .filter((a) => typeof a?.storagePath === "string" && a.storagePath.startsWith(`messages/${reference}/`))
      .map((a) => ({
        message_id: inserted.id,
        storage_path: a.storagePath,
        original_filename: a.originalFilename ?? null,
        mime_type: a.contentType ?? null,
        size_bytes: a.sizeBytes ?? null,
      }));
    if (rows.length > 0) {
      const { error: attErr } = await admin.from("intake_message_attachments").insert(rows);
      if (attErr) console.error("attach insert failed", attErr);
    }
  }

  await logAudit({
    action: "message.send",
    actorId: user.id,
    actorEmail: user.email,
    ip,
    resource: `intake:${reference}`,
    metadata: { from: "client", attachments: attachments.length, length: messageBody.length },
  });

  // Best-effort notify the attorney inbox.
  try {
    await sendAttorneyMessageAlert({
      reference,
      clientName: (intake.client_name as string) ?? user.email ?? "Client",
      clientEmail: user.email ?? (intake.client_email as string) ?? "",
      subject,
      body: messageBody,
      attachmentCount: attachments.length,
    });
  } catch (e) {
    console.error("attorney alert email failed", e);
  }

  return NextResponse.json({ ok: true, id: inserted.id });
}
