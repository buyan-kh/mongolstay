-- Mongolstay intake schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).

-- ─── Tables ────────────────────────────────────────────────────────────────

create table if not exists public.intakes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Filing
  kind text not null check (kind in ('j1f1', 'asylum')),
  reference text not null unique,             -- MS-XXXXXX shown to client + on invoice

  -- Contact
  client_name text,
  client_email text,
  client_phone text,
  locale text not null default 'mn',          -- preferred language at intake

  -- Eligibility answers (JSON of { question_id: value | string[] })
  answers jsonb not null default '{}'::jsonb,

  -- Schedule
  schedule_mode text check (schedule_mode in ('appointment', 'callback')),
  appointment_at timestamptz,                 -- ISO from picker
  appointment_channel text check (appointment_channel in ('office', 'video')),
  callback_window text,                       -- 'today' | 'tomorrowMorning' | etc
  callback_note text,

  -- Payment
  payment_method text check (payment_method in ('card', 'zelle', 'cash')),
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'awaiting', 'failed', 'refunded')),
  amount_cents integer,                       -- (fee + uscis_fee) in cents
  stripe_session_id text,
  stripe_payment_intent text,
  paid_at timestamptz,

  -- Free-form notes attorney can add
  attorney_notes text
);

create index if not exists intakes_created_at_idx on public.intakes (created_at desc);
create index if not exists intakes_payment_status_idx on public.intakes (payment_status);
create index if not exists intakes_client_email_idx on public.intakes (client_email);

create table if not exists public.intake_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  intake_id uuid not null references public.intakes(id) on delete cascade,
  doc_id text not null,                       -- 'passport' | 'i20' | etc — slugs from DOC_IDS
  storage_path text not null,                 -- path in 'intake-docs' bucket
  original_filename text,
  mime_type text,
  size_bytes integer
);

create index if not exists intake_documents_intake_id_idx on public.intake_documents (intake_id);

-- ─── updated_at trigger ───────────────────────────────────────────────────

create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end
$$ language plpgsql;

drop trigger if exists intakes_updated_at on public.intakes;
create trigger intakes_updated_at before update on public.intakes
  for each row execute function public.set_updated_at();

-- ─── RLS ──────────────────────────────────────────────────────────────────
-- v1 policy: lock the tables down completely. All writes happen from server
-- routes using the service-role key (bypasses RLS). When you add Supabase
-- Auth for clients/attorneys, replace with proper per-row policies:
--   * client can read their own intake (auth.uid() = client_user_id)
--   * attorney can read/write any intake where assigned_to = auth.uid()

alter table public.intakes enable row level security;
alter table public.intake_documents enable row level security;

-- (No public policies — anon/auth users get nothing until policies are added.)

-- ─── Storage bucket ───────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'intake-docs',
  'intake-docs',
  false,
  10485760,                                     -- 10 MB; matches /api/upload/sign
  array['application/pdf','image/jpeg','image/png','image/webp']
)
on conflict (id) do nothing;

-- Service-role JWT bypasses RLS by default; this policy is belt-and-suspenders
-- and keeps anon/auth users out until proper per-user policies are added.
drop policy if exists "service-role only on intake-docs" on storage.objects;
create policy "service-role only on intake-docs" on storage.objects
  for all
  using (bucket_id = 'intake-docs' and auth.role() = 'service_role')
  with check (bucket_id = 'intake-docs' and auth.role() = 'service_role');
