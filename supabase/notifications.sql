-- Resident-facing notifications for FloodSense (mobile app + website share this Supabase project).
-- Run once in: Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Requires the website's setup-all.sql to have been run first (needs public.sms_blasts).
-- Safe to re-run: every statement is idempotent.
--
-- How it works: staff send an alert from the website, which inserts a row into sms_blasts.
-- A trigger copies the resident-safe fields into public.notifications, and the app listens
-- to that table through Supabase Realtime. sms_blasts itself stays staff-only because it
-- holds internal fields (sender, recipient counts, provider errors).

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  blast_id   uuid unique references public.sms_blasts (id) on delete cascade,
  type       text not null default 'info',
  title      text not null,
  message    text not null,
  created_at timestamptz not null default now()
);

-- warning = flood warning / critical alert, info = advisory, safe = all clear, notice = general.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in ('warning', 'info', 'safe', 'notice'));

create index if not exists notifications_created_at_idx
  on public.notifications (created_at desc);

-- Row Level Security: signed-in app users can read every notification.
-- No insert/update/delete policy: rows are written only by the trigger below (and the
-- service role). Deleting a blast on the website removes its notification (on delete cascade).
alter table public.notifications enable row level security;

drop policy if exists "notifications_select_all" on public.notifications;
create policy "notifications_select_all" on public.notifications
  for select to authenticated using (true);

-- Map a website alert (sms_blasts) to a notification.
create or replace function public.notification_from_blast()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (blast_id, type, title, message, created_at)
  values (
    new.id,
    case new.level when 'INFO' then 'info' else 'warning' end,
    case new.level
      when 'CRITICAL' then 'Critical Alert'
      when 'WARNING'  then 'Flood Warning'
      else 'Advisory'
    end,
    new.message || ' (' || new.location || ')',
    new.created_at
  )
  on conflict (blast_id) do nothing;
  return new;
end;
$$;

drop trigger if exists notify_on_sms_blast on public.sms_blasts;
create trigger notify_on_sms_blast
  after insert on public.sms_blasts
  for each row execute function public.notification_from_blast();

-- Backfill alerts that were sent before this script was run.
insert into public.notifications (blast_id, type, title, message, created_at)
select
  b.id,
  case b.level when 'INFO' then 'info' else 'warning' end,
  case b.level when 'CRITICAL' then 'Critical Alert' when 'WARNING' then 'Flood Warning' else 'Advisory' end,
  b.message || ' (' || b.location || ')',
  b.created_at
from public.sms_blasts b
on conflict (blast_id) do nothing;

-- Broadcast new rows to the app through Supabase Realtime.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;
