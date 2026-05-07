import { NextResponse } from "next/server";
import { getAdminSupabase, INTAKE_BUCKET } from "@/lib/supabase/admin";
import { isFlowKind } from "@/lib/flow-data";
import { originAllowed, rateLimit, requestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// POST /api/upload/sign
//   body: { kind, reference, docId, filename, contentType, sizeBytes }
//   resp: { uploadUrl, token, path }
//
// Mints a one-shot signed URL into the private 'intake-docs' bucket. Browser
// PUTs the file directly to Supabase Storage — bytes never pass through Next.
//
// Hardening:
//  - Rate-limited per IP (60/hr) so bots can't drain the bucket
//  - Cross-origin POSTs rejected
//  - Reference must match the MS-XXXXXX format the client generates
//  - MIME type and size whitelisted at sign time; the actual bytes are
//    re-validated against Supabase's stored metadata in /api/intake/submit
//    before the document is recorded against an intake.
export async function POST(req: Request) {
  if (!originAllowed(req)) return bad("forbidden", 403);

  const ip = requestIp(req.headers);
  if (!rateLimit("upload-sign", ip, { capacity: 60, refillPerMinute: 1 })) {
    return bad("rate limited", 429);
  }

  const body = await req.json().catch(() => ({}));
  const { kind, reference, docId, filename, contentType, sizeBytes } = body ?? {};

  if (!isFlowKind(kind)) return bad("invalid kind");
  if (typeof reference !== "string" || !/^MS-\d{6}$/.test(reference)) {
    return bad("invalid reference");
  }
  if (typeof docId !== "string" || docId.length === 0 || docId.length > 64 || !/^[a-z0-9_-]+$/i.test(docId)) {
    return bad("invalid docId");
  }
  if (typeof contentType !== "string" || !ALLOWED.includes(contentType)) {
    return bad("unsupported content type");
  }
  if (typeof sizeBytes !== "number" || sizeBytes <= 0 || sizeBytes > MAX_BYTES) {
    return bad("file too large");
  }

  const ext = (() => {
    if (contentType === "application/pdf") return "pdf";
    if (contentType === "image/jpeg") return "jpg";
    if (contentType === "image/png") return "png";
    return "webp";
  })();
  const safeDocId = docId.replace(/[^a-zA-Z0-9_-]/g, "");
  const path = `${kind}/${reference}/${safeDocId}-${Date.now()}.${ext}`;

  const sb = getAdminSupabase();
  const { data, error } = await sb.storage.from(INTAKE_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    return bad(error?.message ?? "sign failed", 500);
  }

  return NextResponse.json({
    uploadUrl: data.signedUrl,
    token: data.token,
    path: data.path,
    originalFilename: typeof filename === "string" ? filename.slice(0, 200) : null,
  });
}
