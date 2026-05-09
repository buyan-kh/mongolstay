-- Attorney referral codes — every signup must enter a valid code, which ties
-- the new client to a specific attorney. The attorney can hand out codes (or
-- multiple codes) on their landing pages.
--
-- attorney_id is nullable so we can seed codes before the attorney has signed
-- up themselves; once they do, an admin can backfill the link.

create table if not exists public.referral_codes (
  code text primary key,
  attorney_id uuid references public.profiles(id) on delete set null,
  attorney_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Wide-open SELECT so the public /signup page can validate a code via the
-- anon key without needing the service role. No insert/update policy — only
-- service role writes, so attackers can't mint themselves a code.
alter table public.referral_codes enable row level security;
drop policy if exists "anyone reads referral_codes" on public.referral_codes;
create policy "anyone reads referral_codes" on public.referral_codes
  for select using (true);

-- Tag every profile with the code that referred them. Lets the attorney
-- query their own client roster ("which intakes came from MSM11?") later.
alter table public.profiles
  add column if not exists referred_by_code text references public.referral_codes(code) on delete set null;

create index if not exists profiles_referred_by_code_idx
  on public.profiles (referred_by_code);

-- Extend the existing signup trigger to capture the referral code from the
-- user's auth metadata (set by /signup before calling supabase.auth.signUp).
create or replace function public.create_profile_on_signup() returns trigger as $$
declare
  v_code text;
begin
  v_code := nullif(new.raw_user_meta_data->>'referral_code', '');
  insert into public.profiles (id, full_name, referred_by_code)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', null),
      case
        when v_code is not null
             and exists (select 1 from public.referral_codes where code = v_code and active)
          then v_code
        else null
      end
    )
    on conflict (id) do nothing;
  return new;
end
$$ language plpgsql security definer;

-- Seed the first code: MSM11 → Emulen. Backfill attorney_id once Emulen has
-- a profile by running:
--   update public.referral_codes set attorney_id = '<uuid>' where code = 'MSM11';
insert into public.referral_codes (code, attorney_name)
  values ('MSM11', 'Emulen')
  on conflict (code) do nothing;
