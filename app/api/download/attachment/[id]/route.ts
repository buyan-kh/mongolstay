import { NextResponse, type NextRequest } from "next/server";
import { getAdminSupabase, INTAKE_BUCKET } from "@/lib/supabase/admin";
import { getServerSupabase } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { requestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

// GET /api/download/attachment/[id]
// Same model as /api/download/[id] but for chat-message attachments.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const userClient = await getServerSupabase();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: att, error } = await userClient
    .from("intake_message_attachments")
    .select("storage_path, original_filename")
    .eq("id", id)
    .maybeSingle();
  if (error || !att) return NextResponse.json({ error: "not found" }, { status: 404 });

  const admin = getAdminSupabase();
  const signed = await admin.storage
    .from(INTAKE_BUCKET)
    .createSignedUrl(att.storage_path, 60 * 5, {
      download: att.original_filename ?? true,
    });
  if (signed.error || !signed.data) {
    return NextResponse.json({ error: signed.error?.message ?? "sign failed" }, { status: 500 });
  }

  await logAudit({
    action: "doc.download",
    actorId: user.id,
    actorEmail: user.email,
    ip: requestIp(req.headers),
    resource: `attachment:${id}`,
    metadata: { path: att.storage_path },
  });

  return NextResponse.redirect(signed.data.signedUrl);
}
