import { NextResponse, type NextRequest } from "next/server";
import { getAdminSupabase, INTAKE_BUCKET } from "@/lib/supabase/admin";
import { getServerSupabase } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { requestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

// GET /api/download/[id]
// Returns a short-lived signed download URL for an intake_documents row.
// RLS-safe: the user-context Supabase client can only see documents on
// intakes that belong to the logged-in user (or the user is an attorney).
// We then mint the actual signed URL with the service-role client.
export async function GET(
  _req: NextRequest,
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

  // RLS scopes this read: clients see only their own intake's documents.
  // Attorneys (once promoted) get a broader policy in 0004_admin.sql.
  const { data: doc, error } = await userClient
    .from("intake_documents")
    .select("storage_path, original_filename")
    .eq("id", id)
    .maybeSingle();

  if (error || !doc) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const admin = getAdminSupabase();
  const signed = await admin.storage
    .from(INTAKE_BUCKET)
    .createSignedUrl(doc.storage_path, 60 * 5, {
      // Hint browsers to download with the original name rather than open inline.
      download: doc.original_filename ?? true,
    });

  if (signed.error || !signed.data) {
    return NextResponse.json(
      { error: signed.error?.message ?? "sign failed" },
      { status: 500 },
    );
  }

  await logAudit({
    action: "doc.download",
    actorId: user.id,
    actorEmail: user.email,
    ip: requestIp(_req.headers),
    resource: `doc:${id}`,
    metadata: { path: doc.storage_path },
  });

  return NextResponse.redirect(signed.data.signedUrl);
}
