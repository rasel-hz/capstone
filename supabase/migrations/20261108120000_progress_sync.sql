-- My Progress in Supabase. Additive and safe to run more than once.
--
-- Progress and rewards share one record per challenge attempt: public.challenge_attempts, which the rewards
-- migration created. This adds the attempt's result to it, so both tabs count the same completions.
-- Other progress entries (energy check-ins, full energy days, finished 7-day journeys) go in progress_events.
-- History saved on a device before this change is uploaded once, marked as imported, and earns no points.

alter table public.challenge_attempts
  add column if not exists status text check (status in ('completed', 'skipped', 'abandoned')),
  add column if not exists accuracy smallint check (accuracy between 0 and 100),
  add column if not exists retries integer check (retries between 0 and 1000),
  add column if not exists duration_sec integer check (duration_sec between 0 and 86400),
  add column if not exists xp integer check (xp between 0 and 1000),
  -- What the activity collected, such as typed text or a self-report. Kept small.
  add column if not exists result jsonb check (result is null or (jsonb_typeof(result) = 'object' and pg_column_size(result) <= 16384)),
  add column if not exists finished_at timestamptz,
  add column if not exists source text not null default 'live' check (source in ('live', 'import'));
create index if not exists challenge_attempts_finished on public.challenge_attempts (user_id, finished_at);

create table if not exists public.progress_events (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('energy', 'full_day', 'program')),
  -- The day for energy and full days, or journey:end-day for a finished journey.
  event_key text not null check (event_key ~ '^[A-Za-z0-9:_ -]{1,80}$'),
  occurred_at timestamptz not null default now(),
  value jsonb not null default '{}'::jsonb check (jsonb_typeof(value) = 'object' and pg_column_size(value) <= 2048),
  primary key (user_id, kind, event_key)
);

-- Users read only their own attempts and events. Writes go through the functions below.
alter table public.progress_events enable row level security;
drop policy if exists "attempts_read_own" on public.challenge_attempts;
create policy "attempts_read_own" on public.challenge_attempts for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "progress_events_read_own" on public.progress_events;
create policy "progress_events_read_own" on public.progress_events for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.progress_events from anon, authenticated;
grant select on public.challenge_attempts, public.progress_events to authenticated;

-- Records how an attempt ended: completed, skipped or abandoned. A completion also earns the reward points,
-- under the same rules as complete_challenge_attempt: once per attempt, only if the server saw the start at
-- least 3 seconds earlier, nothing for self-report, at most 30 awards a day. Repeating it changes nothing.
create or replace function public.finish_challenge_attempt(
  p_attempt_key text, p_mission_key text, p_challenge_id text, p_daily boolean, p_status text,
  p_accuracy integer, p_retries integer, p_duration_sec integer, p_xp integer, p_result jsonb, p_occurred_at timestamptz
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  a public.challenge_attempts;
  started_here boolean := false;
  at_time timestamptz;
  awarded integer := 0;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if p_status not in ('completed', 'skipped', 'abandoned') then raise exception 'invalid_status' using errcode = '22023'; end if;
  select * into a from public.challenge_attempts where user_id = uid and attempt_key = p_attempt_key for update;
  if not found then
    -- No start was recorded (for example it was offline). The result is kept, but it earns no points.
    insert into public.challenge_attempts (user_id, attempt_key, mission_key, challenge_id, is_daily)
    values (uid, p_attempt_key, p_mission_key, p_challenge_id, coalesce(p_daily, false))
    returning * into a;
    started_here := true;
  end if;
  if a.status is not null then
    return jsonb_build_object('awarded', 0, 'already', true) || public.my_points_summary();
  end if;
  -- A late upload keeps the time it really ended, as long as that time is plausible.
  at_time := case when p_occurred_at is not null and p_occurred_at between a.started_at and now() then p_occurred_at else now() end;
  update public.challenge_attempts set
    status = p_status,
    accuracy = case when p_accuracy between 0 and 100 then p_accuracy end,
    retries = greatest(0, least(coalesce(p_retries, 0), 1000)),
    duration_sec = greatest(0, least(coalesce(p_duration_sec, 0), 86400)),
    xp = greatest(0, least(coalesce(p_xp, 0), 1000)),
    result = p_result,
    finished_at = at_time,
    completed_at = case when p_status = 'completed' then coalesce(completed_at, at_time) else completed_at end
  where user_id = uid and attempt_key = p_attempt_key;
  if p_status = 'completed' and not started_here and a.challenge_id <> 'emotion_map'
     and now() - a.started_at >= interval '3 seconds'
     and (select count(*) from public.point_transactions
          where user_id = uid and source = 'challenge' and public.riyadh_day(created_at) = public.riyadh_day(now())) < 30 then
    insert into public.point_transactions (user_id, points, source, award_key, challenge_id, mission_key)
    values (uid, 10, 'challenge', 'challenge:' || p_attempt_key, a.challenge_id, a.mission_key)
    on conflict on constraint point_transactions_award_once do nothing;
    get diagnostics awarded = row_count;
  end if;
  perform public.sync_reward_unlocks(uid);
  return jsonb_build_object('awarded', awarded * 10) || public.my_points_summary();
end;
$$;

-- Uploads history saved on the device before progress moved to Supabase. Marked as imported, earns no points,
-- and repeating it adds nothing. At most 500 rows per call; times can't be in the future.
create or replace function public.import_challenge_history(p_rows jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  r jsonb;
  t timestamptz;
  added integer := 0;
  n integer;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 500 then raise exception 'invalid_rows' using errcode = '22023'; end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    t := least(now(), coalesce((r ->> 'occurred_at')::timestamptz, now()));
    insert into public.challenge_attempts (user_id, attempt_key, mission_key, challenge_id, is_daily, started_at, completed_at,
      status, accuracy, retries, duration_sec, xp, result, finished_at, source)
    values (uid, r ->> 'key', r ->> 'mission_key', r ->> 'challenge_id', false, t,
      case when r ->> 'status' = 'completed' then t end,
      r ->> 'status',
      case when (r ->> 'accuracy') ~ '^\d{1,3}$' and (r ->> 'accuracy')::int <= 100 then (r ->> 'accuracy')::int end,
      greatest(0, least(coalesce((r ->> 'retries')::int, 0), 1000)),
      greatest(0, least(coalesce((r ->> 'duration_sec')::int, 0), 86400)),
      greatest(0, least(coalesce((r ->> 'xp')::int, 0), 1000)),
      case when jsonb_typeof(r -> 'result') = 'object' then r -> 'result' end,
      t, 'import')
    on conflict (user_id, attempt_key) do nothing;
    get diagnostics n = row_count;
    added := added + n;
  end loop;
  return added;
end;
$$;

-- Saves an energy check-in (the day's latest wins), a full energy day, or a finished journey.
create or replace function public.record_progress_event(p_kind text, p_key text, p_value jsonb, p_occurred_at timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  insert into public.progress_events (user_id, kind, event_key, occurred_at, value)
  values (uid, p_kind, p_key, least(now(), coalesce(p_occurred_at, now())), coalesce(p_value, '{}'::jsonb))
  on conflict (user_id, kind, event_key) do update
    set value = excluded.value, occurred_at = excluded.occurred_at
    where public.progress_events.kind = 'energy';
end;
$$;

-- "Delete what I typed" in My Profile also clears it from Supabase. Scores, times and points stay.
-- The keys match TYPED in src/features/plan/privacy.ts.
create or replace function public.clear_my_typed_text()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  update public.challenge_attempts
    set result = result - array['task', 'step', 'topic', 'notes', 'steps', 'plan', 'now', 'later', 'notToday', 'first', 'tasks', 'blocks', 'concerns', 'act', 'unsure', 'next']
    where user_id = auth.uid() and result is not null;
end;
$$;

revoke execute on function public.finish_challenge_attempt(text, text, text, boolean, text, integer, integer, integer, integer, jsonb, timestamptz),
  public.import_challenge_history(jsonb), public.record_progress_event(text, text, jsonb, timestamptz), public.clear_my_typed_text() from public, anon;
grant execute on function public.finish_challenge_attempt(text, text, text, boolean, text, integer, integer, integer, integer, jsonb, timestamptz),
  public.import_challenge_history(jsonb), public.record_progress_event(text, text, jsonb, timestamptz), public.clear_my_typed_text() to authenticated;
