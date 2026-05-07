import { NextResponse } from "next/server";
import { getAdminSupabase, INTAKE_BUCKET } from "@/lib/supabase/admin";
import { isFlowKind } from "@/lib/flow-data";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

// POST /api/upload/sign
//   body: { kind, reference, docId, filename, contentType, sizeBytes }
//   resp: { uploadUrl, token, path }
//
// Mints a single-use signed-upload URL into the private 'intake-docs' bucket.
// The browser PUTs the file directly to Supabase Storage; we never proxy bytes
// through the Next server.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { kind, reference, docId, filename, contentType, sizeBytes } = body ?? {};

  if (!isFlowKind(kind)) return NextResponse.json({ error: "invalid kind" }, { status: 400 });
  if (typeof reference !== "string" || !/^MS-\d{6}$/.test(reference)) {
    return NextResponse.json({ error: "invalid reference" }, { status: 400 });
  }
  if (typeof docId !== "string" || docId.length === 0 || docId.length > 64) {
    return NextResponse.json({ error: "invalid docId" }, { status: 400 });
  }
  if (typeof contentType !== "string" || !ALLOWED.includes(contentType)) {
    return NextResponse.json({ error: "unsupported content type" }, { status: 400 });
  }
  if (typeof sizeBytes !== "number" || sizeBytes <= 0 || sizeBytes > MAX_BYTES) {
    return NextResponse.json({ error: "file too large" }, { status: 400 });
  }

  // Path layout: {kind}/{reference}/{docId}-{timestamp}.{ext}
  // Keeping reference in the path gives attorneys a one-shot way to find a case's files.
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
    return NextResponse.json({ error: error?.message ?? "sign failed" }, { status: 500 });
  }

  return NextResponse.json({
    uploadUrl: data.signedUrl,
    token: data.token,
    path: data.path,
    originalFilename: typeof filename === "string" ? filename.slice(0, 200) : null,
  });
}
