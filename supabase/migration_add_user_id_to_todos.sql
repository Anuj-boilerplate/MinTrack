-- Migration: add user_id ownership to todos, remove subject_id dependency, enable RLS
-- 1. Ensure the todos table exists with the final desired shape (idempotent bootstrap)
-- 2. Add user_id FK column and backfill it from the owning subject's user_id
-- 3. Drop todos with no backfilled owner (orphaned rows)
-- 4. Remove the old subject_id FK constraint and column
-- 5. Enforce not null on user_id, add an index, enable RLS, and add ownership policies
-- Re-runnable: every statement is guarded so repeated execution is safe.

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
  deadline timestamptz
);

alter table public.todos add column if not exists user_id uuid references auth.users (id) on delete cascade;

-- Backfill and cleanup reference the legacy subject_id column, which does not exist
-- on a freshly bootstrapped database (create table if not exists above already produces
-- the final shape). Guard all statements that touch subject_id behind a column check.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'todos'
      and column_name = 'subject_id'
  ) then
    update public.todos t
    set user_id = s.user_id
    from public.subjects s
    where t.subject_id = s.id
      and t.user_id is null;

    delete from public.todos t
    where t.user_id is null
       or (t.subject_id is not null and not exists (select 1 from public.subjects s where s.id = t.subject_id));

    alter table public.todos drop constraint if exists todos_subject_id_fkey;

    alter table public.todos drop column if exists subject_id;
  end if;
end $$;

alter table public.todos alter column user_id set not null;

create index if not exists idx_todos_user_id on public.todos (user_id);

do $$
begin
  if not exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename = 'todos'
      and rowsecurity = true
  ) then
    alter table public.todos enable row level security;
  end if;
end $$;

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