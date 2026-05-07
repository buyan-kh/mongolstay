import "server-only";
import { getAdminSupabase, INTAKE_BUCKET } from "./supabase/admin";
import type { FlowKind } from "./flow-data";

const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

export type DocVerifyResult = { ok: true; size: number; mimeType: string } | { ok: false; reason: string };

// Sniffs the first ~16 bytes of a file to confirm its magic-byte signature
// matches the claimed MIME type. Defends against a client that lies about
// content-type at upload time (e.g. uploads .exe with content-type
// application/pdf).
function sniffMagicBytes(bytes: Uint8Array, mime: string): boolean {
  if (bytes.length < 4) return false;
  if (mime === "application/pdf") {
    // %PDF-
    return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
  }
  if (mime === "image/jpeg") {
    // FF D8 FF
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mime === "image/png") {
    // 89 50 4E 47 0D 0A 1A 0A
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
           bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  }
  if (mime === "image/webp") {
    // 'RIFF' .... 'WEBP'
    return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
           bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  }
  return false;
}

// Re-validates a client-declared upload against what's actually in Supabase
// Storage. Confirms:
//   1. The path lives inside this intake's namespace ({kind}/{reference}/)
//   2. There's no path traversal trickery
//   3. The file actually exists in the bucket
//   4. The stored MIME type is on the whitelist
//   5. The stored size is within the cap
// We do this on /api/intake/submit so the client can't make up a path to a
// file they don't own (e.g. another tenant's passport scan).
export async function verifyStoredDocument(
  kind: FlowKind,
  reference: string,
  path: string,
): Promise<DocVerifyResult> {
  const expectedPrefix = `${kind}/${reference}/`;
  if (typeof path !== "string" || !path.startsWith(expectedPrefix)) {
    return { ok: false, reason: "path outside intake scope" };
  }
  if (path.includes("..") || path.includes("//")) {
    return { ok: false, reason: "invalid path" };
  }
  const filename = path.slice(expectedPrefix.length);
  if (filename.includes("/") || filename.length === 0 || filename.length > 256) {
    return { ok: false, reason: "invalid filename" };
  }

  const sb = getAdminSupabase();
  const { data, error } = await sb.storage
    .from(INTAKE_BUCKET)
    .list(expectedPrefix, { search: filename, limit: 1 });
  if (error) return { ok: false, reason: `storage list failed: ${error.message}` };
  if (!data || data.length === 0) return { ok: false, reason: "file not found in storage" };

  const obj = data[0];
  if (obj.name !== filename) return { ok: false, reason: "name mismatch" };

  const meta = (obj.metadata ?? {}) as { mimetype?: string; size?: number };
  const mimeType = meta.mimetype ?? "";
  const size = typeof meta.size === "number" ? meta.size : 0;

  if (!ALLOWED.includes(mimeType)) return { ok: false, reason: `mime not allowed: ${mimeType}` };
  if (size <= 0 || size > MAX_BYTES) return { ok: false, reason: `size out of range: ${size}` };

  // Magic-byte sniff — fetch just the first 16 bytes via signed URL.
  // Range header is supported by Supabase Storage's signed-URL responses.
  try {
    const headSigned = await sb.storage
      .from(INTAKE_BUCKET)
      .createSignedUrl(path, 30);
    if (headSigned.error || !headSigned.data) {
      return { ok: false, reason: "signed url for sniff failed" };
    }
    const res = await fetch(headSigned.data.signedUrl, {
      headers: { Range: "bytes=0-15" },
    });
    if (!res.ok && res.status !== 206) {
      return { ok: false, reason: `sniff fetch ${res.status}` };
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    if (!sniffMagicBytes(buf, mimeType)) {
      return { ok: false, reason: `magic bytes mismatch for ${mimeType}` };
    }
  } catch (e) {
    return { ok: false, reason: `sniff error: ${(e as Error).message}` };
  }

  return { ok: true, size, mimeType };
}
