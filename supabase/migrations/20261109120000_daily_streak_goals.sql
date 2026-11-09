-- Keeps the daily streak, today's goals and the onboarding answers in Supabase, so they survive a refresh,
-- signing out and in, and a second device. Additive only: no existing table, row or column is removed.
-- Rollback: supabase/rollbacks/20261109120000_daily_streak_goals.down.sql.

-- 1. Onboarding answers, including every kind of help the user picked (multiple choice).
-- The app checks the shape before using it, so an unknown value can't reach the planner.
alter table public.profiles add column if not exists life_profile jsonb
  check (life_profile is null or (jsonb_typeof(life_profile) = 'object' and pg_column_size(life_profile) <= 8192));
grant update (life_profile) on public.profiles to authenticated;

-- 2. Today's goals, in the user's own words. One row per goal per day. A removed goal is marked, not
-- deleted, so another device can't bring it back and no history is lost. Goals never earn points.
create table if not exists public.daily_goals (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  goal_id text not null check (goal_id ~ '^[A-Za-z0-9_-]{1,40}$'),
  text text not null check (char_length(btrim(text)) between 1 and 60),
  position smallint not null default 0 check (position between 0 and 20),
  done boolean not null default false,
  -- The buddy's energy was already given for this goal, so ticking it again on any device gives nothing more.
  energy_given boolean not null default false,
  removed boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, day, goal_id)
);

create or replace function public.daily_goals_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    -- Energy is given once per goal. Once set it stays set.
    new.energy_given := new.energy_given or old.energy_given;
    new.created_at := old.created_at;
  end if;
  new.done_at := case when new.done then coalesce(new.done_at, now()) end;
  return new;
end;
$$;
drop trigger if exists daily_goals_guard on public.daily_goals;
create trigger daily_goals_guard before insert or update on public.daily_goals
  for each row execute function public.daily_goals_guard();

alter table public.daily_goals enable row level security;
drop policy if exists "daily_goals_select_own" on public.daily_goals;
create policy "daily_goals_select_own" on public.daily_goals for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "daily_goals_insert_own" on public.daily_goals;
create policy "daily_goals_insert_own" on public.daily_goals for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "daily_goals_update_own" on public.daily_goals;
create policy "daily_goals_update_own" on public.daily_goals for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- No delete policy: rows are only ever marked as removed.
revoke all on public.daily_goals from anon, authenticated;
grant select, insert, update on public.daily_goals to authenticated;

-- 3. Rest days the user chose, kept with the other progress events. Turning one off keeps the row with on=false.
do $$
declare c text;
begin
  for c in select conname from pg_constraint
    where conrelid = 'public.progress_events'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%kind%'
  loop
    execute format('alter table public.progress_events drop constraint %I', c);
  end loop;
end;
$$;
alter table public.progress_events add constraint progress_events_kind_check
  check (kind in ('energy', 'full_day', 'program', 'rest_day'));

create or replace function public.record_progress_event(p_kind text, p_key text, p_value jsonb, p_occurred_at timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if p_kind = 'rest_day' and (p_key !~ '^\d{4}-\d{2}-\d{2}$' or jsonb_typeof(p_value -> 'on') is distinct from 'boolean') then
    raise exception 'invalid_rest_day' using errcode = '22023';
  end if;
  insert into public.progress_events (user_id, kind, event_key, occurred_at, value)
  values (uid, p_kind, p_key, least(now(), coalesce(p_occurred_at, now())), coalesce(p_value, '{}'::jsonb))
  on conflict (user_id, kind, event_key) do update
    set value = excluded.value, occurred_at = excluded.occurred_at
    where public.progress_events.kind in ('energy', 'rest_day');
end;
$$;

-- 4. The streak, worked out on the server from completed challenges, which are already recorded once per
-- attempt. The rules match src/features/streak/streak.ts:
--   * a day counts when at least one challenge was completed; more completions that day add nothing;
--   * self-report check-ins (emotion_map) never count;
--   * a chosen rest day keeps the streak without adding to it, at most 2 in any 7 days;
--   * with grace on, one missed day in any 7 is protected;
--   * today never breaks the streak; it resets only after a whole missed day.
-- Days are the user's own calendar days in the time zone the app sends.
create table if not exists public.user_streaks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_completed_day date,
  time_zone text not null default 'Asia/Riyadh',
  grace_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.user_streaks enable row level security;
drop policy if exists "user_streaks_select_own" on public.user_streaks;
create policy "user_streaks_select_own" on public.user_streaks for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.user_streaks from anon, authenticated;
grant select on public.user_streaks to authenticated;

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

revoke execute on function public.refresh_my_streak(text, boolean), public.record_progress_event(text, text, jsonb, timestamptz) from public, anon;
grant execute on function public.refresh_my_streak(text, boolean), public.record_progress_event(text, text, jsonb, timestamptz) to authenticated;
revoke execute on function public.daily_goals_guard() from public, anon, authenticated;
