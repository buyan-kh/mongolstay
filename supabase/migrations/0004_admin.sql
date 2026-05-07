-- Admin (attorney) role + policies + audit log.
-- Promotes selected auth.users to attorneys, lets them read every intake
-- and write messages back to clients.

-- ─── Profiles + role ──────────────────────────────────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  role text not null default 'client' check (role in ('client', 'attorney')),
  full_name text
);

-- Auto-create a profile on signup. Default role is 'client'.
create or replace function public.create_profile_on_signup() returns trigger as $$
begin
  insert into public.profiles (id, full_name)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name', null))
    on conflict (id) do nothing;
  return new;
end
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.create_profile_on_signup();

alter table public.profiles enable row level security;

drop policy if exists "user reads own profile" on public.profiles;
create policy "user reads own profile" on public.profiles
  for select using (auth.uid() = id);

-- Helper used by other policies. SECURITY DEFINER so it can read profiles
-- regardless of the calling user's RLS visibility.
create or replace function public.is_attorney() returns boolean as $$
  select exists (
    select 1 from public.profiles
      where id = auth.uid() and role = 'attorney'
  );
$$ language sql stable security definer;

-- ─── Attorney-wide read/update on intakes + documents + messages ──────────

drop policy if exists "attorney reads all intakes" on public.intakes;
create policy "attorney reads all intakes" on public.intakes
  for select using (public.is_attorney());

drop policy if exists "attorney updates intakes" on public.intakes;
create policy "attorney updates intakes" on public.intakes
  for update using (public.is_attorney()) with check (public.is_attorney());

drop policy if exists "attorney reads all documents" on public.intake_documents;
create policy "attorney reads all documents" on public.intake_documents
  for select using (public.is_attorney());

drop policy if exists "attorney reads all messages" on public.intake_messages;
create policy "attorney reads all messages" on public.intake_messages
  for select using (public.is_attorney());

drop policy if exists "attorney writes messages" on public.intake_messages;
create policy "attorney writes messages" on public.intake_messages
  for insert with check (public.is_attorney());

-- ─── Audit log ────────────────────────────────────────────────────────────

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,                            -- snapshot in case the user is later deleted
  ip text,
  action text not null,                        -- 'doc.upload' | 'doc.download' | 'message.send' | 'intake.refund' | etc
  resource text,                               -- e.g. 'intake:MS-XXXXXX' or 'doc:<uuid>'
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists audit_events_created_at_idx on public.audit_events (created_at desc);
create index if not exists audit_events_actor_idx on public.audit_events (actor_id);
create index if not exists audit_events_action_idx on public.audit_events (action);

alter table public.audit_events enable row level security;

drop policy if exists "attorney reads audit_events" on public.audit_events;
create policy "attorney reads audit_events" on public.audit_events
  for select using (public.is_attorney());
-- No insert/update/delete policy — service role writes only.
