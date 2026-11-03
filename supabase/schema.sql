create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  term_start_date timestamptz,
  term_end_date timestamptz
);

create table if not exists public.subjects (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  target_hours numeric(10,2) not null default 0,
  valid_hours numeric(10,2) not null default 0,
  deadline timestamptz,
  accent_color text not null default '#c97b6e',
  version integer not null default 1
);

create table if not exists public.sessions (
  id uuid primary key,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  duration_minutes integer not null check (duration_minutes >= 0),
  is_discarded boolean not null default false
);

create table if not exists public.todos (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  is_completed boolean not null default false,
  is_scratched_today boolean not null default false,
  recurrence_days integer[],
  recurring_group_id uuid,
  scheduled_date date,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  note text,
  deadline timestamptz,
  original_date date
);

-- Migration for existing databases: stores the first scheduled date of an auto-forwarded task
alter table public.todos add column if not exists original_date date;

-- Google Calendar sync: id of the mirrored calendar event, for update/delete mirrors
alter table public.todos add column if not exists google_event_id text;

-- Add this relationship after todos exists so a fresh schema install succeeds.
alter table public.sessions add column if not exists task_id uuid references public.todos (id) on delete set null;

create index if not exists idx_subjects_user_id on public.subjects (user_id);
create index if not exists idx_sessions_subject_id on public.sessions (subject_id);
create index if not exists idx_sessions_start_time on public.sessions (start_time desc);
create index if not exists idx_todos_user_id on public.todos (user_id);
create index if not exists idx_todos_recurring_group on public.todos (recurring_group_id);

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.sessions enable row level security;
alter table public.todos enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
on public.profiles
for delete
to authenticated
using (auth.uid() = id);

drop policy if exists "subjects_select_own" on public.subjects;
create policy "subjects_select_own"
on public.subjects
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "subjects_insert_own" on public.subjects;
create policy "subjects_insert_own"
on public.subjects
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "subjects_update_own" on public.subjects;
create policy "subjects_update_own"
on public.subjects
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "subjects_delete_own" on public.subjects;
create policy "subjects_delete_own"
on public.subjects
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "sessions_select_own" on public.sessions;
create policy "sessions_select_own"
on public.sessions
for select
to authenticated
using (
  exists (
    select 1
    from public.subjects s
    where s.id = sessions.subject_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "sessions_insert_own" on public.sessions;
create policy "sessions_insert_own"
on public.sessions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.subjects s
    where s.id = sessions.subject_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "sessions_update_own" on public.sessions;
create policy "sessions_update_own"
on public.sessions
for update
to authenticated
using (
  exists (
    select 1
    from public.subjects s
    where s.id = sessions.subject_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.subjects s
    where s.id = sessions.subject_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "sessions_delete_own" on public.sessions;
create policy "sessions_delete_own"
on public.sessions
for delete
to authenticated
using (
  exists (
    select 1
    from public.subjects s
    where s.id = sessions.subject_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "todos_select_own" on public.todos;
create policy "todos_select_own"
on public.todos
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "todos_insert_own" on public.todos;
create policy "todos_insert_own"
on public.todos
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "todos_update_own" on public.todos;
create policy "todos_update_own"
on public.todos
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "todos_delete_own" on public.todos;
create policy "todos_delete_own"
on public.todos
for delete
to authenticated
using (auth.uid() = user_id);

-- Google Calendar OAuth tokens per user (refresh tokens never leave the server)
create table if not exists public.google_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  refresh_token text not null,
  access_token text,
  token_expires_at timestamptz,
  connected_at timestamptz not null default now()
);

alter table public.google_tokens enable row level security;

drop policy if exists "google_tokens_select_own" on public.google_tokens;
create policy "google_tokens_select_own"
on public.google_tokens
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "google_tokens_insert_own" on public.google_tokens;
create policy "google_tokens_insert_own"
on public.google_tokens
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "google_tokens_update_own" on public.google_tokens;
create policy "google_tokens_update_own"
on public.google_tokens
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "google_tokens_delete_own" on public.google_tokens;
create policy "google_tokens_delete_own"
on public.google_tokens
for delete
to authenticated
using (auth.uid() = user_id);

-- Cloud-first Active Timers and Atomic RPC Functions
create table if not exists public.active_timers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  task_id uuid references public.todos(id) on delete set null,
  started_at timestamptz not null default now(),
  paused_at timestamptz,
  stopped_at timestamptz,
  total_paused_ms bigint not null default 0,
  focus_length integer not null check (focus_length between 1 and 240),
  break_length integer not null check (break_length between 1 and 120),
  cycles integer not null check (cycles between 1 and 30),
  status text not null default 'running' check (status in ('running', 'paused', 'review')),
  version integer not null default 1
);
alter table public.active_timers enable row level security;
drop policy if exists active_timers_select_own on public.active_timers;
create policy active_timers_select_own on public.active_timers for select to authenticated using (user_id = auth.uid());

-- Enable Realtime replication for active_timers so tabs receive immediate sync
do $$
begin
  alter publication supabase_realtime add table public.active_timers;
exception when others then
  null;
end $$;

-- Timer transitions use database time and run as the authenticated caller.
create or replace function public.start_timer(p_subject_id uuid, p_task_id uuid, p_focus_length integer, p_break_length integer, p_cycles integer)
returns public.active_timers language plpgsql security definer set search_path = '' as $$
declare result public.active_timers;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if not exists (select 1 from public.subjects where id = p_subject_id and user_id = auth.uid()) then raise exception 'Goal not found'; end if;
  if p_task_id is not null and not exists (select 1 from public.todos where id = p_task_id and user_id = auth.uid()) then raise exception 'Task not found'; end if;

  insert into public.active_timers(
    user_id, subject_id, task_id, focus_length, break_length, cycles,
    started_at, paused_at, stopped_at, total_paused_ms, status, version
  )
  values (
    auth.uid(), p_subject_id, p_task_id, p_focus_length, p_break_length, p_cycles,
    now(), null, null, 0, 'running', 1
  )
  on conflict (user_id) do nothing
  returning * into result;

  if not found then
    raise exception 'A timer is already active or awaiting review';
  end if;

  return result;
end $$;

create or replace function public.pause_timer()
returns public.active_timers language plpgsql security definer set search_path = '' as $$
declare result public.active_timers;
begin
  update public.active_timers set status = 'paused', paused_at = now(), version = version + 1
  where user_id = auth.uid() and status = 'running' returning * into result;
  if not found then raise exception 'Timer is not running'; end if;
  return result;
end $$;

create or replace function public.resume_timer()
returns public.active_timers language plpgsql security definer set search_path = '' as $$
declare result public.active_timers;
begin
  update public.active_timers
  set total_paused_ms = total_paused_ms + (extract(epoch from (now() - paused_at)) * 1000)::bigint,
      paused_at = null, status = 'running', version = version + 1
  where user_id = auth.uid() and status = 'paused' returning * into result;
  if not found then raise exception 'Timer is not paused'; end if;
  return result;
end $$;

create or replace function public.stop_timer()
returns public.active_timers language plpgsql security definer set search_path = '' as $$
declare result public.active_timers;
begin
  update public.active_timers
  set total_paused_ms = total_paused_ms + case when paused_at is null then 0 else (extract(epoch from (now() - paused_at)) * 1000)::bigint end,
      paused_at = null, stopped_at = coalesce(stopped_at, now()), status = 'review', version = version + 1
  where user_id = auth.uid() and status in ('running', 'paused') returning * into result;
  if not found then
    select * into result from public.active_timers where user_id = auth.uid() and status = 'review';
    if not found then raise exception 'Timer is not active'; end if;
  end if;
  return result;
end $$;

create or replace function public.clear_timer()
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.active_timers where user_id = auth.uid();
end $$;

-- Save the reviewed log, optionally complete its task, and remove the timer atomically.
create or replace function public.complete_timer(p_sessions jsonb, p_mark_task_completed boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare current_timer public.active_timers;
begin
  select * into current_timer from public.active_timers
  where user_id = auth.uid() and status = 'review' for update;
  if not found then raise exception 'No timer awaiting review'; end if;
  if jsonb_array_length(p_sessions) < 1 or jsonb_array_length(p_sessions) > 2 then
    raise exception 'Expected one or two session rows';
  end if;
  insert into public.sessions(id, subject_id, task_id, start_time, end_time, duration_minutes, is_discarded)
  select coalesce(row.id, gen_random_uuid()), current_timer.subject_id, current_timer.task_id,
    row.start_time, row.end_time, row.duration_minutes, false
  from jsonb_to_recordset(p_sessions) as row(
    id uuid, start_time timestamptz, end_time timestamptz, duration_minutes integer
  );
  if p_mark_task_completed and current_timer.task_id is not null then
    update public.todos set is_completed = true, version = version + 1
    where id = current_timer.task_id and user_id = auth.uid();
  end if;
  delete from public.active_timers where user_id = auth.uid();
end $$;

create or replace function public.clear_all_study_data()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  delete from public.active_timers where user_id = auth.uid();
  delete from public.todos where user_id = auth.uid();
  delete from public.subjects where user_id = auth.uid();
  update public.profiles set term_start_date = null, term_end_date = null where id = auth.uid();
end $$;

revoke all on function public.start_timer(uuid, uuid, integer, integer, integer) from public;
revoke all on function public.pause_timer() from public;
revoke all on function public.resume_timer() from public;
revoke all on function public.stop_timer() from public;
revoke all on function public.clear_timer() from public;
revoke all on function public.complete_timer(jsonb, boolean) from public;
revoke all on function public.clear_all_study_data() from public;
grant execute on function public.start_timer(uuid, uuid, integer, integer, integer) to authenticated;
grant execute on function public.pause_timer() to authenticated;
grant execute on function public.resume_timer() to authenticated;
grant execute on function public.stop_timer() to authenticated;
grant execute on function public.clear_timer() to authenticated;
grant execute on function public.complete_timer(jsonb, boolean) to authenticated;
grant execute on function public.clear_all_study_data() to authenticated;
