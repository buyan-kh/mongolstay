-- Track when an intake's I-539/I-589 was actually mailed/filed with USCIS.
-- Set by the attorney via the /admin "Mark filed" action.

alter table public.intakes
  add column if not exists filed_at timestamptz;

create index if not exists intakes_filed_at_idx on public.intakes (filed_at);
