create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  term_start_date timestamptz,
  term_end_date timestamptz,
  active_term_id uuid
);

create table if not exists public.terms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  version integer not null default 1,
  constraint terms_valid_range check (end_date >= start_date),
  constraint terms_owner_id_unique unique(user_id, id)
);

alter table public.profiles drop constraint if exists profiles_active_term_id_fkey;
alter table public.profiles add constraint profiles_active_term_id_fkey
  foreign key (id, active_term_id) references public.terms(user_id, id);

create table if not exists public.subjects (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  term_id uuid not null,
  name text not null,
  target_hours numeric(10,2) not null default 0,
  valid_hours numeric(10,2) not null default 0,
  deadline timestamptz,
  accent_color text not null default '#7652ed',
  version integer not null default 1,
  constraint subjects_term_id_fkey foreign key (user_id, term_id)
    references public.terms(user_id, id) on delete cascade
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
  term_id uuid not null,
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
  original_date date,
  constraint todos_term_id_fkey foreign key (user_id, term_id)
    references public.terms(user_id, id) on delete cascade
);

-- Migration for existing databases: stores the first scheduled date of an auto-forwarded task
alter table public.todos add column if not exists original_date date;

-- Add this relationship after todos exists so a fresh schema install succeeds.
alter table public.sessions add column if not exists task_id uuid references public.todos (id) on delete set null;

create index if not exists idx_subjects_user_id on public.subjects (user_id);
create index if not exists idx_terms_user on public.terms(user_id, start_date desc);
create index if not exists idx_subjects_term on public.subjects(term_id);
create index if not exists idx_sessions_subject_id on public.sessions (subject_id);
create index if not exists idx_sessions_start_time on public.sessions (start_time desc);
create index if not exists idx_todos_user_id on public.todos (user_id);
create index if not exists idx_todos_term on public.todos(term_id);
create index if not exists idx_todos_recurring_group on public.todos (recurring_group_id);

alter table public.profiles enable row level security;
alter table public.terms enable row level security;
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

drop policy if exists terms_select_own on public.terms;
create policy terms_select_own on public.terms for select to authenticated using (user_id = auth.uid());
drop policy if exists terms_insert_own on public.terms;
create policy terms_insert_own on public.terms for insert to authenticated with check (user_id = auth.uid());
drop policy if exists terms_update_own on public.terms;
create policy terms_update_own on public.terms for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists terms_delete_own on public.terms;
create policy terms_delete_own on public.terms for delete to authenticated using (user_id = auth.uid());

do $$ begin
  alter publication supabase_realtime add table public.profiles;
exception when others then null;
end $$;

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
  update public.profiles set active_term_id = null where id = auth.uid();
  delete from public.terms where user_id = auth.uid();
  delete from public.todos where user_id = auth.uid();
  delete from public.subjects where user_id = auth.uid();
  update public.profiles set active_term_id = null, term_start_date = null, term_end_date = null where id = auth.uid();
end $$;

create or replace function public.create_term_and_switch(p_name text, p_start_date date, p_end_date date)
returns public.terms language plpgsql security definer set search_path = '' as $$
declare result public.terms;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if exists (select 1 from public.active_timers where user_id = auth.uid()) then
    raise exception 'Stop or finish the active timer before creating a term';
  end if;
  if nullif(trim(p_name), '') is null then raise exception 'Term name is required'; end if;
  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then raise exception 'Invalid term date range'; end if;
  insert into public.terms(user_id, name, start_date, end_date)
  values (auth.uid(), trim(p_name), p_start_date, p_end_date) returning * into result;
  insert into public.profiles(id, active_term_id, term_start_date, term_end_date)
  values (auth.uid(), result.id, p_start_date, p_end_date)
  on conflict (id) do update set active_term_id = excluded.active_term_id,
    term_start_date = excluded.term_start_date, term_end_date = excluded.term_end_date;
  return result;
end $$;

create or replace function public.switch_active_term(p_term_id uuid)
returns public.terms language plpgsql security definer set search_path = '' as $$
declare result public.terms;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if exists (select 1 from public.active_timers where user_id = auth.uid()) then
    raise exception 'Stop or finish the active timer before switching terms';
  end if;
  select * into result from public.terms where id = p_term_id and user_id = auth.uid();
  if not found then raise exception 'Term not found'; end if;
  insert into public.profiles(id, active_term_id, term_start_date, term_end_date)
  values (auth.uid(), result.id, result.start_date, result.end_date)
  on conflict (id) do update set active_term_id = excluded.active_term_id,
    term_start_date = excluded.term_start_date, term_end_date = excluded.term_end_date;
  return result;
end $$;

create or replace function public.update_term(p_term_id uuid, p_name text, p_start_date date, p_end_date date)
returns public.terms language plpgsql security definer set search_path = '' as $$
declare result public.terms;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if exists (select 1 from public.active_timers where user_id = auth.uid()) then
    raise exception 'Stop or finish the active timer before editing a term';
  end if;
  if nullif(trim(p_name), '') is null then raise exception 'Term name is required'; end if;
  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then raise exception 'Invalid term date range'; end if;
  select * into result from public.terms where id = p_term_id and user_id = auth.uid() for update;
  if not found then raise exception 'Term not found'; end if;
  update public.terms set name = trim(p_name), start_date = p_start_date, end_date = p_end_date,
    version = version + 1
  where id = p_term_id and user_id = auth.uid()
  returning * into result;
  update public.profiles set term_start_date = p_start_date, term_end_date = p_end_date
  where id = auth.uid() and active_term_id = p_term_id;
  return result;
end $$;

create or replace function public.delete_term(p_term_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  target public.terms;
  replacement public.terms;
  current_term_id uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if exists (select 1 from public.active_timers where user_id = auth.uid()) then
    raise exception 'Stop or finish the active timer before deleting a term';
  end if;
  select * into target from public.terms where id = p_term_id and user_id = auth.uid() for update;
  if not found then raise exception 'Term not found'; end if;
  select active_term_id into current_term_id from public.profiles where id = auth.uid() for update;
  if current_term_id = p_term_id then
    select * into replacement from public.terms
    where user_id = auth.uid() and id <> p_term_id
    order by start_date desc, created_at desc
    limit 1;
    if found then
      update public.profiles set active_term_id = replacement.id,
        term_start_date = replacement.start_date, term_end_date = replacement.end_date
      where id = auth.uid();
    else
      update public.profiles set active_term_id = null, term_start_date = null, term_end_date = null
      where id = auth.uid();
    end if;
  end if;
  delete from public.terms where id = p_term_id and user_id = auth.uid();
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
revoke all on function public.create_term_and_switch(text, date, date) from public;
revoke all on function public.switch_active_term(uuid) from public;
revoke all on function public.update_term(uuid, text, date, date) from public;
revoke all on function public.delete_term(uuid) from public;
grant execute on function public.create_term_and_switch(text, date, date) to authenticated;
grant execute on function public.switch_active_term(uuid) to authenticated;
grant execute on function public.update_term(uuid, text, date, date) to authenticated;
grant execute on function public.delete_term(uuid) to authenticated;
