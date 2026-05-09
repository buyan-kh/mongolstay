import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getServerSupabase } from "@/lib/supabase/server";
import { isFlowKind } from "@/lib/flow-data";
import { getUser, isAttorney } from "@/lib/auth";
import { verifyStoredDocument } from "@/lib/upload-verify";
import { logAudit } from "@/lib/audit";
import { originAllowed, requestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

// POST /api/dashboard/upload/attach
//   body: { reference, path, filename, contentType, sizeBytes, label? }
//   resp: { ok, document: { id, ... } }
//
// Records a post-submission custom upload against an existing intake. The
// file must already exist in storage (uploaded via the signed URL minted
// by /api/dashboard/upload/sign). Re-validates the storage object the same
// way /api/intake/submit does.
export async function POST(req: Request) {
  if (!originAllowed(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { reference, path, filename, contentType, sizeBytes, label } = body ?? {};

  if (typeof reference !== "string" || !/^MS-\d{6}$/.test(reference)) {
    return NextResponse.json({ error: "invalid reference" }, { status: 400 });
  }
  if (typeof path !== "string" || path.length === 0 || path.length > 512) {
    return NextResponse.json({ error: "invalid path" }, { status: 400 });
  }

  // Ownership check (RLS-enforced for clients; attorneys bypass via service role).
  type IntakeShape = { id: string; kind: string; reference: string };
  const userSb = await getServerSupabase();
  const u = await userSb
    .from("intakes")
    .select("id, kind, reference")
    .eq("reference", reference)
    .maybeSingle();
  let intake = (u.data as IntakeShape | null) ?? null;
  if (!intake && (await isAttorney())) {
    const admin = getAdminSupabase();
    const r = await admin
      .from("intakes")
      .select("id, kind, reference")
      .eq("reference", reference)
      .maybeSingle();
    intake = (r.data as IntakeShape | null) ?? null;
  }
  if (!intake) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!isFlowKind(intake.kind)) {
    return NextResponse.json({ error: "invalid intake state" }, { status: 500 });
  }

  // Re-validate the file actually exists, lives inside this intake's namespace,
  // and matches its declared MIME type via magic-byte sniff.
  const verdict = await verifyStoredDocument(intake.kind, intake.reference, path);
  if (!verdict.ok) {
    return NextResponse.json({ error: `verify: ${verdict.reason}` }, { status: 400 });
  }

  const trimmedLabel =
    typeof label === "string" && label.trim().length > 0
      ? label.trim().slice(0, 120)
      : null;

  const sb = getAdminSupabase();
  const { data: inserted, error } = await sb
    .from("intake_documents")
    .insert({
      intake_id: intake.id,
      doc_id: "custom",
      storage_path: path,
      original_filename:
        typeof filename === "string" ? filename.slice(0, 200) : null,
      mime_type: verdict.mimeType,
      size_bytes: verdict.size,
      label: trimmedLabel,
    })
    .select("id, doc_id, original_filename, label, storage_path, created_at")
    .single();

  if (error || !inserted) {
    return NextResponse.json(
      { error: error?.message ?? "insert failed" },
      { status: 500 },
    );
  }

  await logAudit({
    action: "doc.upload",
    actorId: user.id,
    actorEmail: user.email,
    ip: requestIp(req.headers),
    resource: `intake:${reference}`,
    metadata: {
      doc_id: "custom",
      label: trimmedLabel,
      size: verdict.size,
      via: "dashboard",
    },
  });

  return NextResponse.json({ ok: true, document: inserted });
}
