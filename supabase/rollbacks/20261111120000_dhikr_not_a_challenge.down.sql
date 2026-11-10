-- Puts back the three functions as they were: dhikr earns points and counts towards the streak again.

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

create or replace function public.complete_challenge_attempt(p_attempt_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  a public.challenge_attempts;
  awarded integer := 0;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  select * into a from public.challenge_attempts where user_id = uid and attempt_key = p_attempt_key for update;
  if not found then raise exception 'attempt_not_started' using errcode = 'P0002'; end if;
  if now() - a.started_at < interval '3 seconds' then raise exception 'too_fast' using errcode = '22023'; end if;
  update public.challenge_attempts set completed_at = coalesce(completed_at, now()) where user_id = uid and attempt_key = p_attempt_key;
  if a.challenge_id <> 'emotion_map'
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

create or replace function public.refresh_my_streak(p_tz text, p_grace boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  tz text := 'Asia/Riyadh';
  today date;
  done_days date[];
  rest_days date[];
  counted_rest date[] := '{}';
  d date;
  start_day date;
  cur integer := 0;
  best integer := 0;
  last_grace date;
  stored integer;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if p_tz is not null and exists (select 1 from pg_catalog.pg_timezone_names where name = p_tz) then tz := p_tz; end if;
  today := (now() at time zone tz)::date;

  select coalesce(array_agg(distinct (a.finished_at at time zone tz)::date), '{}') into done_days
    from public.challenge_attempts a
    where a.user_id = uid and a.status = 'completed' and a.finished_at is not null
      and a.challenge_id <> all (array['emotion_map']) and (a.finished_at at time zone tz)::date <= today;
  -- The CASE keeps the date cast away from other kinds of events, whose keys aren't dates.
  select coalesce(array_agg(q.k order by q.k), '{}') into rest_days
    from (
      select case when e.kind = 'rest_day' and e.event_key ~ '^\d{4}-\d{2}-\d{2}$' then e.event_key::date end as k
      from public.progress_events e
      where e.user_id = uid and e.kind = 'rest_day' and e.value ->> 'on' = 'true'
    ) q
    where q.k is not null and q.k <= today;

  select min(x) into start_day from unnest(done_days || rest_days) x;
  start_day := greatest(coalesce(start_day, today), today - 400);
  d := start_day;
  while d <= today loop
    if d = any (done_days) then
      cur := cur + 1;
    elsif d = any (rest_days) and (select count(*) from unnest(counted_rest) r where r > d - 7) < 2 then
      counted_rest := counted_rest || d;
    elsif d = today then
      null; -- Still open.
    elsif coalesce(p_grace, true) and cur > 0 and (last_grace is null or d - last_grace >= 7) then
      last_grace := d;
    else
      cur := 0;
    end if;
    best := greatest(best, cur);
    d := d + 1;
  end loop;

  insert into public.user_streaks as s (user_id, current_streak, longest_streak, last_completed_day, time_zone, grace_enabled, updated_at)
  values (uid, cur, best, (select max(x) from unnest(done_days) x), tz, coalesce(p_grace, true), now())
  on conflict (user_id) do update set
    current_streak = excluded.current_streak,
    -- The longest streak never goes down.
    longest_streak = greatest(s.longest_streak, excluded.longest_streak),
    last_completed_day = excluded.last_completed_day,
    time_zone = excluded.time_zone,
    grace_enabled = excluded.grace_enabled,
    updated_at = now()
  returning longest_streak into stored;

  return jsonb_build_object(
    'current', cur,
    'longest', stored,
    'today', today,
    'today_done', today = any (done_days),
    'days', (select coalesce(jsonb_agg(x order by x), '[]') from unnest(done_days) x where x > today - 400),
    'rest', (select coalesce(jsonb_agg(x order by x), '[]') from unnest(rest_days) x where x > today - 60)
  );
end;
$$;
