import { NextResponse } from "next/server";
import { getAdminSupabase, INTAKE_BUCKET } from "@/lib/supabase/admin";
import { getServerSupabase } from "@/lib/supabase/server";
import { isFlowKind } from "@/lib/flow-data";
import { getUser, isAttorney } from "@/lib/auth";
import { originAllowed, rateLimit, requestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// POST /api/dashboard/upload/sign
//   body: { reference, filename, contentType, sizeBytes }
//   resp: { uploadUrl, token, path }
//
// Auth-gated counterpart to /api/upload/sign (which is for the anonymous
// intake-time upload). Used by the dashboard "Upload more documents" UI.
// Requires the caller to own the intake (RLS-enforced via user-context
// supabase client) or be an attorney.
export async function POST(req: Request) {
  if (!originAllowed(req)) return bad("forbidden", 403);

  const user = await getUser();
  if (!user) return bad("unauthorized", 401);

  const ip = requestIp(req.headers);
  if (!rateLimit("dashboard-upload-sign", ip, { capacity: 60, refillPerMinute: 1 })) {
    return bad("rate limited", 429);
  }

  const body = await req.json().catch(() => ({}));
  const { reference, filename, contentType, sizeBytes } = body ?? {};

  if (typeof reference !== "string" || !/^MS-\d{6}$/.test(reference)) {
    return bad("invalid reference");
  }
  if (typeof contentType !== "string" || !ALLOWED.includes(contentType)) {
    return bad("unsupported content type");
  }
  if (typeof sizeBytes !== "number" || sizeBytes <= 0 || sizeBytes > MAX_BYTES) {
    return bad("file too large");
  }

  // Ownership check: the user-context client only sees rows the caller can
  // legally see (RLS), so .maybeSingle() returns null if they don't own it.
  // Attorneys bypass via the env-allowlist + profile role.
  const userSb = await getServerSupabase();
  let { data: intake } = await userSb
    .from("intakes")
    .select("id, kind, reference")
    .eq("reference", reference)
    .maybeSingle();
  if (!intake && (await isAttorney())) {
    const admin = getAdminSupabase();
    const r = await admin
      .from("intakes")
      .select("id, kind, reference")
      .eq("reference", reference)
      .maybeSingle();
    intake = r.data;
  }
  if (!intake) return bad("not found", 404);
  if (!isFlowKind(intake.kind)) return bad("invalid intake state", 500);

  const ext =
    contentType === "application/pdf"
      ? "pdf"
      : contentType === "image/jpeg"
      ? "jpg"
      : contentType === "image/png"
      ? "png"
      : "webp";
  const slug = (typeof filename === "string" ? filename : "doc")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "extra";
  // Flat path (no subfolder) so the existing verifyStoredDocument helper —
  // which forbids slashes after the {kind}/{reference}/ prefix — accepts it.
  const path = `${intake.kind}/${intake.reference}/extra-${slug}-${Date.now()}.${ext}`;

  const sb = getAdminSupabase();
  const { data, error } = await sb.storage
    .from(INTAKE_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) return bad(error?.message ?? "sign failed", 500);

  return NextResponse.json({
    uploadUrl: data.signedUrl,
    token: data.token,
    path: data.path,
    originalFilename:
      typeof filename === "string" ? filename.slice(0, 200) : null,
  });
}
