import "server-only";
import { getAdminSupabase } from "./supabase/admin";

export type AuditAction =
  | "doc.upload"
  | "doc.download"
  | "intake.submit"
  | "intake.mark_paid"
  | "intake.mark_filed"
  | "intake.refund"
  | "message.send"
  | "auth.signup"
  | "auth.signin";

// Best-effort audit logging. Never throws — never let a logging hiccup
// block the actual operation. Log + swallow.
export async function logAudit(opts: {
  action: AuditAction;
  actorId?: string | null;
  actorEmail?: string | null;
  ip?: string | null;
  resource?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    const sb = getAdminSupabase();
    await sb.from("audit_events").insert({
      actor_id: opts.actorId ?? null,
      actor_email: opts.actorEmail ?? null,
      ip: opts.ip ?? null,
      action: opts.action,
      resource: opts.resource ?? null,
      // jsonb takes any JSON-serializable object; cast to keep generated types happy.
      metadata: (opts.metadata ?? {}) as unknown as import("./supabase/types").Json,
    });
  } catch (e) {
    console.error("audit log failed", opts.action, e);
  }
}
