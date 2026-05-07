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

  if (!reference || !/^MS-\d{6}$/.test(reference)) {
    return NextResponse.json({ error: "invalid reference" }, { status: 400 });
  }
  if (messageBody.length === 0 || messageBody.length > 10_000) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const sb = getAdminSupabase();
  const { data: intake, error: intakeErr } = await sb
    .from("intakes")
    .select("id, client_email, client_name, reference")
    .eq("reference", reference)
    .maybeSingle();
  if (intakeErr || !intake) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { error } = await sb.from("intake_messages").insert({
    intake_id: intake.id,
    direction: "in",                  // attorney → client
    subject,
    body: messageBody,
    read_at: null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
