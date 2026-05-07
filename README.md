# mongolstay.com

Immigration filings — landing site + 4-step intake flow (J-1→F-1 and Asylum).

## Stack

- **Next.js 16** (App Router, Turbopack) on **Vercel**
- **Supabase** — DB, Auth, Storage (intake records + uploaded documents)
- **Stripe** — flat-fee payments ($2,000 J-1→F-1 / $4,000 asylum)
- **Resend** — confirmation emails to client + intake alerts to firm
- **Cal.com** — appointment booking (embedded on `/file/[kind]/appointment`)
- **react-hook-form + Zod** — form validation
- **Cloudflare Turnstile** — bot protection on intake
- **next-intl** — Mongolian (default) + English

## Run

```bash
cp .env.example .env.local   # fill in keys
npm install
npm run dev
```

`/` is Mongolian, `/en` is English.

## What's wired vs what's stub

| Piece | Status |
| --- | --- |
| Landing page (nav, hero, services, strip, how, letter wall, attorneys, CTA, footer) | ✅ done |
| 4-step flow at `/file/[kind]/[step]` | ✅ shells + UI |
| Locale switcher (mn ⇄ en) | ✅ done |
| Form state across steps | ✅ persisted in `localStorage` (per-kind) |
| Stripe checkout | ⚠ wired (`/api/stripe/checkout`, `/api/stripe/webhook`) — needs `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Cal.com appointment | ⚠ embed installed — needs `NEXT_PUBLIC_CAL_LINK` set to your event-type slug |
| Document uploads | 🟥 **stubbed** — currently a fake 350ms delay. Wire to Supabase Storage signed-URL upload. |
| Intake persistence | 🟥 **stubbed** — webhook is the source of truth; insert into Supabase `intakes` table on `checkout.session.completed`. |
| Resend confirmation email | 🟥 **stubbed** — call from webhook after successful payment. |
| Cloudflare Turnstile | 🟥 not yet on the form. Add to `EligibilityStep` or before checkout. |
| Auth | 🟥 not yet. Use `@supabase/ssr` server client in `lib/supabase/server.ts` to add returning-client login. |

## Routes

```
/                                  → landing (mn default)
/en                                → landing (en)
/file/[kind]                       → redirects to /eligibility
/file/[kind]/eligibility           → step 1
/file/[kind]/documents             → step 2
/file/[kind]/payment               → step 3 (POSTs to /api/stripe/checkout)
/file/[kind]/appointment           → step 4 (Cal.com embed)
/file/[kind]/filed                 → success
/api/stripe/checkout               → creates Stripe Checkout Session
/api/stripe/webhook                → Stripe → us (use `stripe listen` locally)
```

`[kind]` is `j1f1` or `asylum` — anything else 404s via `isFlowKind` in the layout.

## Architecture notes

- **Multi-route flow, not a modal.** Each step is its own page so a Stripe redirect can land users on `/file/[kind]/appointment?paid=1&session_id=...` cleanly, and refreshes don't lose progress.
- **Per-kind state** lives in a client `FlowProvider` backed by `localStorage` (`mongolstay:flow:{kind}`). Promote to a server-stored draft once Supabase Auth is wired.
- **Translations** live in `messages/{mn,en}.json`. UI strings only — proper nouns (USCIS, J-1, F-1, attorney names, NY address, country names in the strip) stay in source. Country names in the strip and attorney role/focus fields are not translated yet — easy follow-up.
- **Visual design** is preserved verbatim from the prototype in `.design-extract/`. CSS lives in `app/globals.css` + `app/uscis.css`.

## Deploy

Vercel project should auto-detect Next.js 16. Required env vars (see `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `RESEND_API_KEY`, `RESEND_FROM`, `INTAKE_TO`
- `NEXT_PUBLIC_CAL_LINK`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`

Stripe webhook endpoint should point to `https://mongolstay.com/api/stripe/webhook`.

## Compliance — do before public launch

- Privacy policy, terms of service, attorney advertising disclaimers (NY-specific language)
- Engagement letter (click-to-sign) before money/docs change hands
- Confirm with state bar whether flat-fee retainers can deposit straight to operating, or require IOLTA
- Tighten Supabase RLS so only the assigned attorney + the client can read a case's files
