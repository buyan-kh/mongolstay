# Setup — what to do in each dashboard

Order matters: Supabase first (everything else needs the URL), then Stripe, Resend, Cloudflare.

---

## 1. Supabase (CLI flow)

The Supabase CLI is already installed (`supabase --version` should print `2.x.x`),
and the project is already initialized — config lives at `supabase/config.toml`,
schema at `supabase/migrations/0001_init.sql`. You just need to **create a remote
project, link it, and push the migration**.

### a. Create a hosted project

Easiest via dashboard (1 min):

1. https://supabase.com → **New project**
2. Name: `mongolstay-prod` (or `mongolstay-dev`)
3. Region close to your users (NY office → `us-east-1`)
4. **Save the database password** — you'll paste it into `supabase link`
5. Wait ~2 min for the project to provision

(CLI alternative — once logged in: `supabase projects create mongolstay --org-id <your-org> --region us-east-1 --db-password <password>`. You can list orgs with `supabase orgs list`.)

### b. Login + link the local project

```bash
# Opens a browser for OAuth — do this once per machine
supabase login

# Find your project ref (the xxxx in https://xxxx.supabase.co)
supabase projects list

# Link this directory to that project (prompts for the DB password from step a)
supabase link --project-ref <project-ref>
```

### c. Push the migration

```bash
supabase db push
```

This applies `supabase/migrations/0001_init.sql` to the remote DB:
- creates `intakes` and `intake_documents` tables (with the updated_at trigger and RLS lockdown)
- creates the **private** `intake-docs` storage bucket (10 MB cap, PDF/JPG/PNG/WebP only)
- adds a `service-role only` policy on `storage.objects` for that bucket

Verify in the dashboard: **Table Editor** should list both tables, and **Storage** should show `intake-docs`.

### d. (Optional) Generate typed schema

Replace the hand-rolled `lib/supabase/types.ts` with auto-generated types:

```bash
supabase gen types typescript --linked > lib/supabase/types.gen.ts
```

Then update `lib/supabase/admin.ts` to import `Database` from `./types.gen` and delete the hand-rolled file.

### e. Copy the keys to `.env.local`

**Project Settings → API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...   # KEEP SECRET — bypasses RLS
```

---

## 2. Stripe

### Get API keys

1. https://dashboard.stripe.com → **Developers → API keys**
2. Copy:

```
STRIPE_SECRET_KEY=sk_test_...               (or sk_live_... for prod)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Local webhook (for `npm run dev`)

```bash
brew install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

It prints a webhook signing secret like `whsec_…`. Set it:

```
STRIPE_WEBHOOK_SECRET=whsec_…
```

### Production webhook

1. **Developers → Webhooks → Add endpoint**
2. URL: `https://mongolstay.com/api/stripe/webhook`
3. Events: `checkout.session.completed`
4. Copy the signing secret into Vercel env vars as `STRIPE_WEBHOOK_SECRET`.

---

## 3. Resend

1. https://resend.com → **API keys → Create API key** (full access for now).
2. **Domains → Add domain** → `mongolstay.com`. Add the DNS records they show you. Wait for verification.
3. Set:

```
RESEND_API_KEY=re_...
RESEND_FROM="Mongolstay <intake@mongolstay.com>"
INTAKE_TO=intake@mongolstay.com           # where attorney alerts land
```

Until the domain is verified you can use Resend's test domain (`onboarding@resend.dev`) but only to your own verified inbox.

---

## 4. Cloudflare Turnstile

1. https://dash.cloudflare.com → **Turnstile → Add site**
2. Domain: `mongolstay.com` (and `localhost` for dev — add it as a separate site or use the **Always Pass** managed mode for testing).
3. Copy:

```
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4...
TURNSTILE_SECRET_KEY=0x4...
```

If `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is unset, the widget doesn't render — useful for local dev. The server-side check (`lib/turnstile.ts`) also skips when `TURNSTILE_SECRET_KEY` is unset.

---

## 5. Manual payment instructions

Whatever Zelle/cash recipient details you actually want printed on the invoice and shown to clients. **Leave `NEXT_PUBLIC_ZELLE_EMAIL` unset** until you have a real recipient — the UI hides the row and tells the client we'll text the handle after they confirm.

```
# NEXT_PUBLIC_ZELLE_EMAIL=          # leave empty until real
NEXT_PUBLIC_ZELLE_NAME="Mongolstay PLLC"
NEXT_PUBLIC_OFFICE_ADDRESS="388 Market Street, Suite 1300, San Francisco, CA 94111"
```

---

## 6. Run

```bash
cp .env.example .env.local   # then fill in the values above
npm install
npm run dev
```

Visit http://localhost:3000 (mn) or http://localhost:3000/en.

---

## 7. End-to-end smoke test

1. Visit `/file/j1f1/eligibility`, answer 5 questions.
2. `/documents` — upload a real PDF. Check **Supabase → Storage → intake-docs** — your file should be there at `j1f1/MS-XXXXXX/passport-….pdf`.
3. `/schedule` — fill name/email/phone, pick a time.
4. `/payment` — try each tab:
   - **Card**: clicks through to Stripe Checkout. Use card `4242 4242 4242 4242`. Stripe webhook fires → check **Supabase → Table Editor → intakes** for a `paid` row.
   - **Zelle**: returns to `/filed` with `awaiting`. Check `intakes` for the `awaiting` row.
   - **Cash**: same.
5. `/filed` — invoice renders. Click **Print invoice**. The print preview should show only the invoice (nav/buttons hidden).

Resend dashboard → **Logs** — confirm both the client confirmation and the attorney-inbox alert went out for the card path.

---

## 8. Real-world prerequisites (per the audit)

These aren't code, but you need them before charging real customers:

- Real attorneys + bar numbers (replace the placeholder list in `lib/flow-data.ts`)
- Real office address (env var `NEXT_PUBLIC_OFFICE_ADDRESS`)
- Real performance stats — or remove the unverifiable "125 / 96% / 42" stats
- Real (redacted) approval letters or remove the wall
- Engagement-letter click-through before payment
- Privacy policy, terms of service, NY attorney advertising disclaimer pages
- State-bar guidance on whether $2k/$4k flat fees can deposit straight to operating or need IOLTA
