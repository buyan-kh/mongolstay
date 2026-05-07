# Security model — document handling

Clients upload sensitive immigration documents (passports, I-94s,
financial records, persecution evidence). This file is the threat model
+ what's enforced today + what's still on the roadmap.

## What's enforced today

### Storage
- **Private bucket only.** `intake-docs` is created with `public = false`
  and a `service-role only` RLS policy on `storage.objects`. Anonymous and
  authenticated users get nothing — clients reach their own files only via
  signed download URLs minted server-side.
- **MIME whitelist + 10 MB cap** baked into the bucket itself
  (`allowed_mime_types`, `file_size_limit`).
- **Encryption at rest.** Supabase Storage uses S3-backed encryption
  (AES-256). Disk encryption is on by default.
- **TLS in transit.** All Storage operations and signed URLs are HTTPS.

### Upload flow
- **Direct-to-storage signed URLs.** Bytes never pass through the Next
  server — `/api/upload/sign` mints a one-shot signed URL and the browser
  PUTs straight to Supabase. Less attack surface than proxying.
- **Per-IP rate limit.** `/api/upload/sign` is capped at 60 requests/hour,
  `/api/intake/submit` at 10 requests/hour. In-memory bucket; promote to
  Upstash/KV when you need cross-region accuracy.
- **Same-origin POST only.** Both endpoints reject requests whose `Origin`
  header doesn't match `Host`. Defense-in-depth alongside SameSite cookies.
- **Schema validation at sign time.** `kind`, `reference` (`MS-\d{6}`),
  `docId` (alphanumeric), `contentType` (whitelist), `sizeBytes` (cap) all
  validated before a URL is minted.
- **Cloudflare Turnstile gate.** When `TURNSTILE_SECRET_KEY` is set,
  `/api/intake/submit` requires a valid token. Skipped in dev.
- **Server-side re-verification.** `verifyStoredDocument` (lib/upload-verify.ts)
  runs on every `/api/intake/submit`. For each declared document path it
  confirms:
    1. Path is inside `${kind}/${reference}/` — prevents tenant-crossing.
    2. No `..` or `//` traversal.
    3. File actually exists in Storage (queried via Storage list API).
    4. Stored MIME is on the whitelist.
    5. Stored size is within cap.
  If any check fails, the entire submit is rejected and no
  `intake_documents` row is created.

### Database
- **RLS by default.** `intakes`, `intake_documents`, `intake_messages` all
  have RLS enabled with no public/anon policies. The service-role key
  (used only from server routes) bypasses RLS.
- **Per-user reads.** Logged-in clients can only `SELECT` rows where
  `auth.uid() = client_user_id` (or the doc/message is on an intake they
  own).
- **Per-user message updates.** Clients can only mark their *own* messages
  read. They cannot create/edit/delete messages.

### Auth
- **Password requirements.** Minimum 10 characters, must include lower
  case, upper case, and a digit (enforced both client-side in the signup
  form and server-side via Supabase config).
- **Email confirmation** in production (Supabase default; disabled locally
  for testing).
- **Refresh-token rotation** on (Supabase default).
- **JWT expiry** 1 hour (Supabase default).

## Roadmap — for when you scale

These are not blockers for soft launch but should land before SOC 2 / HIPAA
or any volume of real client data:

1. **Magic-byte sniffing on PDFs/images.** Today we trust the MIME stored
   by Storage (which is what the browser declared). For real defense
   against a malicious upload, fetch the head of the object server-side and
   verify magic bytes. Add to `verifyStoredDocument`.

2. **Virus / malware scan.** ClamAV worker triggered by a Supabase Storage
   webhook on object insert. Quarantine bucket for failures.

3. **Audit log.** Every upload, signed-URL grant, document download, and
   admin access logged to an `audit_events` table with user_id + IP +
   user-agent + action + resource. Surface to attorneys via /admin.

4. **Per-document encryption keys.** Generate a random AES key per file,
   encrypt client-side before upload, store the key in DB encrypted with
   the project root key. Defense if Supabase service-role key leaks.

5. **MFA for client accounts.** Supabase Auth has TOTP support; toggle on
   and add an enroll page.

6. **Field-level encryption for PII.** Use pgcrypto (`pgp_sym_encrypt`) on
   `intakes.client_phone`, `client_name`, A-numbers in `answers`. Keep keys
   in Supabase Vault or env.

7. **Rotating signed-URL TTL.** Currently 1 hour (Supabase default). Tune
   down to 5–15 minutes for download URLs delivered to clients.

8. **Cross-region rate limiting.** The in-memory bucket is per-instance.
   Move to Upstash Redis for global enforcement on Vercel.

9. **Privileged session re-auth.** Require fresh auth (or step-up) before
   sensitive actions like downloading another user's docs (admin) or
   refunding a payment.

10. **DDoS / WAF.** Front Vercel with Cloudflare proxy + WAF rules; add
    a connecting-IP allowlist for the Stripe webhook.

11. **Data retention policy.** Auto-purge intake docs N years after
    case close (per state bar record-retention rules — typically 7 years
    in NY). Today: nothing is deleted.

12. **Bug bounty / disclosure policy.** Add `/.well-known/security.txt`
    and a SECURITY.md disclosure section once you're public.

## What you should know about the service-role key

`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. **It is the most sensitive secret
in this project.** It lives only in:

- `.env.local` on the developer machine (gitignored)
- Vercel project env vars (server-side only — never ship to client)
- The Stripe webhook receives it via env var

If you suspect it's leaked: **rotate immediately** in Supabase Project
Settings → API → "Reset service_role key", then redeploy.

Anon/publishable key is OK to expose (it's `NEXT_PUBLIC_*`); RLS is what
keeps clients in their lane.
