-- Remove the retired Google Calendar integration and stored OAuth credentials.
drop table if exists public.google_tokens;
alter table public.todos drop column if exists google_event_id;
