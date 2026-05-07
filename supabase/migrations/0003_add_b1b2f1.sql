-- Add B-1/B-2 → F-1 as a third filing kind.
-- Same I-539 form as J-1 → F-1 but a different eligibility scenario:
-- a tourist or business visitor changing to student status.

alter table public.intakes
  drop constraint intakes_kind_check;

alter table public.intakes
  add constraint intakes_kind_check
    check (kind in ('j1f1', 'asylum', 'b1b2f1'));
