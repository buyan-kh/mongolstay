import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { isAttorney } from "@/lib/auth";
import { getUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { sendClientMessage } from "@/lib/email";
import { originAllowed, requestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!originAllowed(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await isAttorney())) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const reference = typeof body?.reference === "string" ? body.reference : null;
  const subject = typeof body?.subject === "string" && body.subject.trim() ? body.subject.trim().slice(0, 200) : null;
  const messageBody = typeof body?.body === "string" ? body.body.trim() : "";
  const attachments: Array<{
    storagePath: string;
    originalFilename?: string;
    contentType?: string;
    sizeBytes?: number;
  }> = Array.isArray(body?.attachments) ? body.attachments : [];

  if (!reference || !/^MS-\d{6}$/.test(reference)) {
    return NextResponse.json({ error: "invalid reference" }, { status: 400 });
  }
  if (messageBody.length === 0 && attachments.length === 0) {
    return NextResponse.json({ error: "message empty" }, { status: 400 });
  }
  if (messageBody.length > 10_000) {
    return NextResponse.json({ error: "message too long" }, { status: 400 });
  }

  const sb = getAdminSupabase();
  const { data: intake, error: intakeErr } = await sb
    .from("intakes")
    .select("id, client_email, client_name, reference")
    .eq("reference", reference)
    .maybeSingle();
  if (intakeErr || !intake) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Look up the attorney's display name for the message header. Falls back to
  // the email's local-part so even attorneys without full_name set show
  // something more human than "your attorney".
  const { data: profile } = await sb
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  const senderName =
    profile?.full_name?.trim() ||
    (user.email ? user.email.split("@")[0] : null);

  const { data: inserted, error } = await sb
    .from("intake_messages")
    .insert({
      intake_id: intake.id,
      direction: "in",                  // attorney → client
      subject,
      body: messageBody,
      read_at: null,
      sender_id: user.id,
      sender_name: senderName,
    })
    .select("id")
    .single();
  if (error || !inserted) return NextResponse.json({ error: error?.message ?? "insert failed" }, { status: 500 });

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
      const { error: attErr } = await sb.from("intake_message_attachments").insert(rows);
      if (attErr) console.error("attorney attach insert failed", attErr);
    }
  }

  await logAudit({
    action: "message.send",
    actorId: user.id,
    actorEmail: user.email,
    ip: requestIp(req.headers),
    resource: `intake:${reference}`,
    metadata: { hasSubject: !!subject, length: messageBody.length },
  });

  // Best-effort email notification to client.
  if (intake.client_email) {
    try {
      await sendClientMessage({
        to: intake.client_email as string,
        clientName: (intake.client_name as string) ?? "",
        reference,
        subject,
        body: messageBody,
      });
    } catch (e) {
      console.error("client message email failed", e);
    }
  }

  return NextResponse.json({ ok: true });
}
