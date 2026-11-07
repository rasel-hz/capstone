-- Undoes 20261108120000_progress_sync.sql and returns the schema to what the rewards migration left.
-- Warning: this deletes the progress data that migration added (attempt results, energy check-ins, full days,
-- finished journeys). Rows that existed before it, and all points and unlocks, are untouched.
-- The rewards function complete_challenge_attempt keeps working without anything removed here.

drop function if exists public.finish_challenge_attempt(text, text, text, boolean, text, integer, integer, integer, integer, jsonb, timestamptz);
drop function if exists public.import_challenge_history(jsonb);
drop function if exists public.record_progress_event(text, text, jsonb, timestamptz);
drop function if exists public.clear_my_typed_text();
drop table if exists public.progress_events;
drop policy if exists "attempts_read_own" on public.challenge_attempts;
revoke select on public.challenge_attempts from authenticated;
drop index if exists public.challenge_attempts_finished;
alter table public.challenge_attempts
  drop column if exists status,
  drop column if exists accuracy,
  drop column if exists retries,
  drop column if exists duration_sec,
  drop column if exists xp,
  drop column if exists result,
  drop column if exists finished_at,
  drop column if exists source;
