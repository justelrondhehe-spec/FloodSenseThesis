-- Residents table for FloodSense (mobile app + website share this Supabase project).
-- Run once in: Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to re-run: every statement is idempotent.

create table if not exists public.residents (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text,
  full_name    text,
  phone_number text,
  address      text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- In case a residents table already existed with fewer columns.
alter table public.residents add column if not exists email        text;
alter table public.residents add column if not exists full_name    text;
alter table public.residents add column if not exists phone_number text;
alter table public.residents add column if not exists address      text;
alter table public.residents add column if not exists updated_at   timestamptz not null default now();

-- Philippine mobile number in international format, e.g. +639171234567.
alter table public.residents drop constraint if exists residents_phone_format;
alter table public.residents
  add constraint residents_phone_format
  check (phone_number is null or phone_number ~ '^\+639[0-9]{9}$');

-- Keep updated_at current.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists residents_set_updated_at on public.residents;
create trigger residents_set_updated_at
  before update on public.residents
  for each row execute function public.set_updated_at();

-- Row Level Security: a signed-in user can only see and change their own row.
-- The publishable key in the app is safe only because of these policies.
alter table public.residents enable row level security;

drop policy if exists "residents_select_own" on public.residents;
create policy "residents_select_own" on public.residents
  for select to authenticated using (auth.uid() = id);

drop policy if exists "residents_insert_own" on public.residents;
create policy "residents_insert_own" on public.residents
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "residents_update_own" on public.residents;
create policy "residents_update_own" on public.residents
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- No delete policy on purpose: deleting the auth user removes the row (on delete cascade).
