-- Alerts + push notifications for FloodSense (mobile app + website share this Supabase project).
-- Run once in: Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1) Alerts: written by the barangay (website / SQL editor), read by every signed-in resident.
-- ---------------------------------------------------------------------------
create table if not exists public.alerts ( 
  id         uuid primary key default gen_random_uuid(),
  type       text not null default 'info' check (type in ('warning', 'info', 'safe', 'notice')),
  title      text not null check (char_length(title) between 1 and 120),
  message    text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists alerts_created_at_idx on public.alerts (created_at desc);

alter table public.alerts enable row level security;

drop policy if exists "alerts_read_all_signed_in" on public.alerts;
create policy "alerts_read_all_signed_in" on public.alerts
  for select to authenticated using (true);

-- No insert/update/delete policy on purpose: residents can never create alerts.
-- Create alerts from the Supabase dashboard / SQL editor, or from the website using the service role on a server.

-- Live updates in the app (Realtime). Ignore the error if it was already added.
do $$
begin
  alter publication supabase_realtime add table public.alerts;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 2) Push tokens: one row per phone, owned by the signed-in resident.
-- ---------------------------------------------------------------------------
create table if not exists public.push_tokens (
  token      text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  platform   text,
  updated_at timestamptz not null default now()
);

create index if not exists push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

drop policy if exists "push_tokens_select_own" on public.push_tokens;
create policy "push_tokens_select_own" on public.push_tokens
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "push_tokens_insert_own" on public.push_tokens;
create policy "push_tokens_insert_own" on public.push_tokens
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "push_tokens_update_own" on public.push_tokens;
create policy "push_tokens_update_own" on public.push_tokens
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "push_tokens_delete_own" on public.push_tokens;
create policy "push_tokens_delete_own" on public.push_tokens
  for delete to authenticated using (auth.uid() = user_id);

-- Registers (or re-assigns) a phone's token to the signed-in resident. Used by the app instead of a
-- plain insert so a phone that switches accounts still works, and nobody can claim a token for someone else.
create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.push_tokens (token, user_id, platform, updated_at)
  values (p_token, auth.uid(), p_platform, now())
  on conflict (token) do update
    set user_id = auth.uid(), platform = excluded.platform, updated_at = now();
$$;

revoke all on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Send a push to every registered phone whenever an alert is inserted.
--    Uses pg_net to call Expo's push service (100 messages per request) - no server code needed.
-- ---------------------------------------------------------------------------
create extension if not exists pg_net with schema extensions;

create or replace function public.send_alert_push()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  batch jsonb;
begin
  for batch in
    select jsonb_agg(jsonb_build_object(
             'to', t.token,
             'title', new.title,
             'body', new.message,
             'sound', 'default',
             'priority', 'high',
             'channelId', 'flood-alerts',
             'data', jsonb_build_object('alertId', new.id, 'type', new.type)
           ))
    from (
      select token, (row_number() over (order by token) - 1) / 100 as grp
      from public.push_tokens
    ) t
    group by t.grp
  loop
    perform net.http_post(
      url     := 'https://exp.host/--/api/v2/push/send',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json'),
      body    := batch
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists alerts_send_push on public.alerts;
create trigger alerts_send_push
  after insert on public.alerts
  for each row execute function public.send_alert_push();

-- ---------------------------------------------------------------------------
-- Try it (after a phone has logged in and allowed notifications):
--   insert into public.alerts (type, title, message)
--   values ('warning', 'Flood Warning', 'Water level rising in Brgy Pamplona Tres. Prepare to evacuate.');
-- ---------------------------------------------------------------------------
