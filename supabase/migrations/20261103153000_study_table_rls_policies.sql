-- Enable owner-scoped access for the cloud study data tables.
-- Reapply safely: policies are dropped and recreated with the intended rules.

alter table public.profiles enable row level security;
alter table public.terms enable row level security;
alter table public.subjects enable row level security;
alter table public.todos enable row level security;
alter table public.sessions enable row level security;
alter table public.active_timers enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own on public.profiles
  for delete to authenticated using (id = auth.uid());

drop policy if exists terms_select_own on public.terms;
create policy terms_select_own on public.terms
  for select to authenticated using (user_id = auth.uid());
drop policy if exists terms_insert_own on public.terms;
create policy terms_insert_own on public.terms
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists terms_update_own on public.terms;
create policy terms_update_own on public.terms
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists terms_delete_own on public.terms;
create policy terms_delete_own on public.terms
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists subjects_select_own on public.subjects;
create policy subjects_select_own on public.subjects
  for select to authenticated using (user_id = auth.uid());
drop policy if exists subjects_insert_own on public.subjects;
create policy subjects_insert_own on public.subjects
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists subjects_update_own on public.subjects;
create policy subjects_update_own on public.subjects
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists subjects_delete_own on public.subjects;
create policy subjects_delete_own on public.subjects
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists todos_select_own on public.todos;
create policy todos_select_own on public.todos
  for select to authenticated using (user_id = auth.uid());
drop policy if exists todos_insert_own on public.todos;
create policy todos_insert_own on public.todos
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists todos_update_own on public.todos;
create policy todos_update_own on public.todos
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists todos_delete_own on public.todos;
create policy todos_delete_own on public.todos
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists sessions_select_own on public.sessions;
create policy sessions_select_own on public.sessions
  for select to authenticated using (
    exists (select 1 from public.subjects s where s.id = sessions.subject_id and s.user_id = auth.uid())
  );
drop policy if exists sessions_insert_own on public.sessions;
create policy sessions_insert_own on public.sessions
  for insert to authenticated with check (
    exists (select 1 from public.subjects s where s.id = sessions.subject_id and s.user_id = auth.uid())
  );
drop policy if exists sessions_update_own on public.sessions;
create policy sessions_update_own on public.sessions
  for update to authenticated using (
    exists (select 1 from public.subjects s where s.id = sessions.subject_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.subjects s where s.id = sessions.subject_id and s.user_id = auth.uid())
  );
drop policy if exists sessions_delete_own on public.sessions;
create policy sessions_delete_own on public.sessions
  for delete to authenticated using (
    exists (select 1 from public.subjects s where s.id = sessions.subject_id and s.user_id = auth.uid())
  );

drop policy if exists active_timers_select_own on public.active_timers;
create policy active_timers_select_own on public.active_timers
  for select to authenticated using (user_id = auth.uid());
