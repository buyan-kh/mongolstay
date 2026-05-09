-- Track which attorney sent each chat message so the client UI can show
-- "From Anika Chadna" instead of generic "From your attorney". sender_name
-- is denormalized at insert time so we don't need to expose profiles via RLS
-- to clients viewing the thread.
alter table public.intake_messages
  add column if not exists sender_id uuid references public.profiles(id) on delete set null,
  add column if not exists sender_name text;

create index if not exists intake_messages_sender_id_idx on public.intake_messages (sender_id);

-- Custom-document support: clients can upload extra files post-submission with
-- a free-form label ("Marriage certificate", "I-94 v2", etc.). The pre-defined
-- doc_ids (ds2019, i94, etc.) keep using NULL label.
alter table public.intake_documents
  add column if not exists label text;
