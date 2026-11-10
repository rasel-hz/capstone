-- Keeps the personal journey and the user's challenge feedback with their account, so the companion's
-- recommendations and any journey change survive a refresh, signing out and in, and a second device.
-- Additive only: two columns on profiles, in the same way as life_profile. No row is changed.
-- Rollback: supabase/rollbacks/20261111090000_journey_feedback.down.sql.

-- The journey (the steps, which are done, the chapter themes, and the last change made from the chat).
alter table public.profiles add column if not exists journey jsonb
  check (journey is null or (jsonb_typeof(journey) = 'object' and pg_column_size(journey) <= 65536));

-- The answers to "did it suit you?" after challenges: the challenge ID, 1 / 0 / -1, and when. At most the
-- last 60, which the app keeps; nothing the user typed.
alter table public.profiles add column if not exists challenge_feedback jsonb
  check (challenge_feedback is null or (jsonb_typeof(challenge_feedback) = 'array' and pg_column_size(challenge_feedback) <= 16384));

-- Users can change only these columns of their own row (profiles_update_own already limits the row).
grant update (journey, challenge_feedback) on public.profiles to authenticated;
