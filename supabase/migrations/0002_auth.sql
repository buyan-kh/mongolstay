-- Mongolstay auth + dashboard schema
-- Adds client ownership of intakes, RLS for client-side reads, and an
-- intake_messages table for "you have a new email" indicators on the dashboard.

-- ─── Link intakes to authenticated users ──────────────────────────────────

alter table public.intakes
  add column if not exists client_user_id uuid references auth.users(id) on delete set null;

create index if not exists intakes_client_user_id_idx on public.intakes(client_user_id);

-- Auto-claim trigger: when a user signs up with an email that matches a prior
-- anonymous intake, attach that intake to their account. Lets clients walk
-- through the intake flow without an account, then see it in their dashboard
-- the moment they sign up with the same email.
create or replace function public.attach_intakes_on_signup() returns trigger as $$
begin
  update public.intakes
    set client_user_id = new.id
    where client_user_id is null
      and lower(client_email) = lower(new.email);
  return new;
end
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.attach_intakes_on_signup();

-- ─── Messages (attorney ↔ client correspondence) ──────────────────────────

create table if not exists public.intake_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  intake_id uuid not null references public.intakes(id) on delete cascade,
  direction text not null check (direction in ('in', 'out')),  -- 'in' = attorney→client, 'out' = client→attorney
  subject text,
  body text not null,
  read_at timestamptz
);

create index if not exists intake_messages_intake_id_idx
  on public.intake_messages(intake_id, created_at desc);
create index if not exists intake_messages_unread_idx
  on public.intake_messages(intake_id) where read_at is null;

alter table public.intake_messages enable row level security;

-- ─── RLS policies (clients can read their own data) ───────────────────────

drop policy if exists "client reads own intakes" on public.intakes;
create policy "client reads own intakes" on public.intakes
  for select
  using (auth.uid() = client_user_id);

drop policy if exists "client reads own intake_documents" on public.intake_documents;
create policy "client reads own intake_documents" on public.intake_documents
  for select
  using (
    exists (
      select 1 from public.intakes
      where intakes.id = intake_documents.intake_id
        and intakes.client_user_id = auth.uid()
    )
  );

drop policy if exists "client reads own messages" on public.intake_messages;
create policy "client reads own messages" on public.intake_messages
  for select
  using (
    exists (
      select 1 from public.intakes
      where intakes.id = intake_messages.intake_id
        and intakes.client_user_id = auth.uid()
    )
  );

-- Clients can mark their own messages read (update read_at) but nothing else.
drop policy if exists "client marks own messages read" on public.intake_messages;
create policy "client marks own messages read" on public.intake_messages
  for update
  using (
    exists (
      select 1 from public.intakes
      where intakes.id = intake_messages.intake_id
        and intakes.client_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.intakes
      where intakes.id = intake_messages.intake_id
        and intakes.client_user_id = auth.uid()
    )
  );
