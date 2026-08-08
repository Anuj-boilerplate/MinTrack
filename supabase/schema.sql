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
  accent_color text not null default '#c97b6e'
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
  scheduled_date date,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  note text,
  deadline timestamptz,
  original_date date
);

-- Migration for existing databases: stores the first scheduled date of an auto-forwarded task
alter table public.todos add column if not exists original_date date;

create index if not exists idx_subjects_user_id on public.subjects (user_id);
create index if not exists idx_sessions_subject_id on public.sessions (subject_id);
create index if not exists idx_sessions_start_time on public.sessions (start_time desc);
create index if not exists idx_todos_user_id on public.todos (user_id);

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
