import { NextResponse } from "next/server";
import { getAdminSupabase, INTAKE_BUCKET } from "@/lib/supabase/admin";
import { getUser, isAttorney } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { originAllowed, rateLimit, requestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// POST /api/upload/sign/message
//   body: { reference, filename, contentType, sizeBytes }
//   resp: { uploadUrl, path }
//
// Mints a signed upload URL for an attachment on a chat message. Path layout:
//   intake-docs/messages/{reference}/{ts}-{safeFilename}
// Auth: must own the intake (or be an attorney). Direction (in/out) is
// validated when the message itself is created — this route only uploads
// the bytes; the message row + attachment row come later via /api/messages
// or /api/admin/messages.
export async function POST(req: Request) {
  if (!originAllowed(req)) return bad("forbidden", 403);

  const ip = requestIp(req.headers);
  if (!rateLimit("upload-sign-message", ip, { capacity: 60, refillPerMinute: 1 })) {
    return bad("rate limited", 429);
  }

  const user = await getUser();
  if (!user) return bad("unauthorized", 401);

  const body = await req.json().catch(() => ({}));
  const { reference, filename, contentType, sizeBytes } = body ?? {};

  if (typeof reference !== "string" || !/^MS-\d{6}$/.test(reference)) return bad("invalid reference");
  if (typeof contentType !== "string" || !ALLOWED.includes(contentType)) return bad("unsupported content type");
  if (typeof sizeBytes !== "number" || sizeBytes <= 0 || sizeBytes > MAX_BYTES) return bad("file too large");

  // Verify the user has access to this intake — either client owner or attorney.
  const userClient = await getServerSupabase();
  const { data: intake } = await userClient
    .from("intakes")
    .select("id")
    .eq("reference", reference)
    .maybeSingle();
  if (!intake && !(await isAttorney())) return bad("not found", 404);

  const ext = (() => {
    if (contentType === "application/pdf") return "pdf";
    if (contentType === "image/jpeg") return "jpg";
    if (contentType === "image/png") return "png";
    return "webp";
  })();
  const safeFilename = typeof filename === "string"
    ? filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80)
    : `attachment.${ext}`;
  const path = `messages/${reference}/${Date.now()}-${safeFilename}`;

  const sb = getAdminSupabase();
  const { data, error } = await sb.storage.from(INTAKE_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return bad(error?.message ?? "sign failed", 500);

  return NextResponse.json({
    uploadUrl: data.signedUrl,
    token: data.token,
    path: data.path,
  });
}
