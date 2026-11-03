-- Multiple academic terms. Existing study data is attached to a generated legacy term.
create table if not exists public.terms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  version integer not null default 1,
  constraint terms_valid_range check (end_date >= start_date),
  constraint terms_owner_id_unique unique(user_id, id)
);

alter table public.profiles add column if not exists active_term_id uuid;
alter table public.profiles drop constraint if exists profiles_active_term_id_fkey;
alter table public.profiles add constraint profiles_active_term_id_fkey
  foreign key (id, active_term_id) references public.terms(user_id, id);

alter table public.subjects add column if not exists term_id uuid;
alter table public.todos add column if not exists term_id uuid;

-- Migrate current profiles to a named term, then attach all existing goals/tasks.
insert into public.terms(user_id, name, start_date, end_date)
select p.id, 'Current term', p.term_start_date::date, p.term_end_date::date
from public.profiles p
where p.term_start_date is not null and p.term_end_date is not null
  and not exists (select 1 from public.terms t where t.user_id = p.id);

-- Some accounts may have study data but no complete profile dates. Give those rows a
-- bounded legacy term so the new non-null ownership constraint does not orphan them.
insert into public.terms(user_id, name, start_date, end_date)
select owners.user_id, 'Imported term', current_date, current_date + 119
from (
  select user_id from public.subjects where term_id is null
  union
  select user_id from public.todos where term_id is null
) owners
where not exists (select 1 from public.terms t where t.user_id = owners.user_id);

insert into public.profiles(id)
select distinct t.user_id from public.terms t
on conflict (id) do nothing;

update public.profiles p set active_term_id = (
  select t.id from public.terms t where t.user_id = p.id order by t.created_at desc limit 1
) where p.active_term_id is null and exists (select 1 from public.terms t where t.user_id = p.id);

update public.subjects s set term_id = p.active_term_id
from public.profiles p where p.id = s.user_id and s.term_id is null;
update public.todos t set term_id = p.active_term_id
from public.profiles p where p.id = t.user_id and t.term_id is null;

alter table public.subjects alter column term_id set not null;
alter table public.todos alter column term_id set not null;
alter table public.subjects drop constraint if exists subjects_term_id_fkey;
alter table public.subjects drop constraint if exists subjects_user_id_term_id_fkey;
alter table public.subjects add constraint subjects_term_id_fkey
  foreign key (user_id, term_id) references public.terms(user_id, id) on delete cascade;
alter table public.todos drop constraint if exists todos_term_id_fkey;
alter table public.todos drop constraint if exists todos_user_id_term_id_fkey;
alter table public.todos add constraint todos_term_id_fkey
  foreign key (user_id, term_id) references public.terms(user_id, id) on delete cascade;
create index if not exists idx_terms_user on public.terms(user_id, start_date desc);
create index if not exists idx_subjects_term on public.subjects(term_id);
create index if not exists idx_todos_term on public.todos(term_id);

alter table public.terms enable row level security;
drop policy if exists terms_select_own on public.terms;
create policy terms_select_own on public.terms for select to authenticated using (user_id = auth.uid());
drop policy if exists terms_insert_own on public.terms;
create policy terms_insert_own on public.terms for insert to authenticated with check (user_id = auth.uid());
drop policy if exists terms_update_own on public.terms;
create policy terms_update_own on public.terms for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists terms_delete_own on public.terms;
create policy terms_delete_own on public.terms for delete to authenticated using (user_id = auth.uid());

-- Keep each open client on the profile's currently selected term.
do $$ begin
  alter publication supabase_realtime add table public.profiles;
exception when others then null;
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
  values (auth.uid(), trim(p_name), p_start_date, p_end_date)
  returning * into result;
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

-- Extend the existing clear action to remove every term and all term-owned data.
create or replace function public.clear_all_study_data()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  delete from public.active_timers where user_id = auth.uid();
  update public.profiles set active_term_id = null where id = auth.uid();
  delete from public.terms where user_id = auth.uid();
  update public.profiles set active_term_id = null, term_start_date = null, term_end_date = null where id = auth.uid();
end $$;

revoke all on function public.create_term_and_switch(text, date, date) from public;
revoke all on function public.switch_active_term(uuid) from public;
grant execute on function public.create_term_and_switch(text, date, date) to authenticated;
grant execute on function public.switch_active_term(uuid) to authenticated;
revoke all on function public.clear_all_study_data() from public;
grant execute on function public.clear_all_study_data() to authenticated;
