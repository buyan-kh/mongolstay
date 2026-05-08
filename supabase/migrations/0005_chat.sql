-- Chat: clients can send messages back, attach files to messages.

-- ─── Allow clients to insert direction='out' on their own intakes ────────
-- Attorneys still write direction='in' under the policy in 0004_admin.sql.

drop policy if exists "client writes own messages" on public.intake_messages;
create policy "client writes own messages" on public.intake_messages
  for insert
  with check (
    direction = 'out'
    and exists (
      select 1 from public.intakes
      where intakes.id = intake_messages.intake_id
        and intakes.client_user_id = auth.uid()
    )
  );

-- ─── Message attachments ─────────────────────────────────────────────────

create table if not exists public.intake_message_attachments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  message_id uuid not null references public.intake_messages(id) on delete cascade,
  storage_path text not null,
  original_filename text,
  mime_type text,
  size_bytes integer
);

create index if not exists intake_message_attachments_message_id_idx
  on public.intake_message_attachments (message_id);

alter table public.intake_message_attachments enable row level security;

-- Clients can read attachments on messages of their own intakes.
drop policy if exists "client reads own message attachments" on public.intake_message_attachments;
create policy "client reads own message attachments" on public.intake_message_attachments
  for select
  using (
    exists (
      select 1 from public.intake_messages m
      join public.intakes i on i.id = m.intake_id
      where m.id = intake_message_attachments.message_id
        and i.client_user_id = auth.uid()
    )
  );

-- Attorneys can read all attachments.
drop policy if exists "attorney reads all message attachments" on public.intake_message_attachments;
create policy "attorney reads all message attachments" on public.intake_message_attachments
  for select using (public.is_attorney());

-- Inserts go through the server (service role bypass), so no public insert policy.
