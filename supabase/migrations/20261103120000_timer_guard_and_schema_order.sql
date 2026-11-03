-- Forward fix: preserve an existing timer if another tab/device tries to start one.
-- INSERT ... ON CONFLICT DO NOTHING takes the user_id uniqueness lock, so concurrent
-- starts cannot both succeed or reset an already running/paused/review timer.
create or replace function public.start_timer(
  p_subject_id uuid,
  p_task_id uuid,
  p_focus_length integer,
  p_break_length integer,
  p_cycles integer
)
returns public.active_timers
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.active_timers;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  if p_focus_length not between 1 and 240
    or p_break_length not between 1 and 120
    or p_cycles not between 1 and 30 then
    raise exception 'Invalid timer settings';
  end if;

  if not exists (
    select 1 from public.subjects
    where id = p_subject_id and user_id = auth.uid()
  ) then
    raise exception 'Goal not found';
  end if;

  if p_task_id is not null and not exists (
    select 1 from public.todos
    where id = p_task_id and user_id = auth.uid()
  ) then
    raise exception 'Task not found';
  end if;

  insert into public.active_timers (
    user_id, subject_id, task_id, focus_length, break_length, cycles,
    started_at, paused_at, stopped_at, total_paused_ms, status, version
  ) values (
    auth.uid(), p_subject_id, p_task_id, p_focus_length, p_break_length, p_cycles,
    now(), null, null, 0, 'running', 1
  )
  on conflict (user_id) do nothing
  returning * into result;

  if not found then
    raise exception 'A timer is already active or awaiting review';
  end if;

  return result;
end;
$$;

revoke all on function public.start_timer(uuid, uuid, integer, integer, integer) from public;
grant execute on function public.start_timer(uuid, uuid, integer, integer, integer) to authenticated;
