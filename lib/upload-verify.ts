import "server-only";
import { getAdminSupabase, INTAKE_BUCKET } from "./supabase/admin";
import type { FlowKind } from "./flow-data";

const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

export type DocVerifyResult = { ok: true; size: number; mimeType: string } | { ok: false; reason: string };

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

  return { ok: true, size, mimeType };
}
