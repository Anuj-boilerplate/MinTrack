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

revoke all on function public.update_term(uuid, text, date, date) from public;
revoke all on function public.delete_term(uuid) from public;
grant execute on function public.update_term(uuid, text, date, date) to authenticated;
grant execute on function public.delete_term(uuid) to authenticated;
