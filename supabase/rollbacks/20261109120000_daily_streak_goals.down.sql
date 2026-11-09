-- Rollback for 20261109120000_daily_streak_goals.sql. Run by hand only if that migration has to be undone.
-- WARNING: this removes what the migration added, including its data: saved daily goals, stored streaks,
-- rest days and saved onboarding answers. Take a backup first (scripts/db-backup.ts). Nothing older is touched.

drop function if exists public.refresh_my_streak(text, boolean);
drop table if exists public.user_streaks;

delete from public.progress_events where kind = 'rest_day';
alter table public.progress_events drop constraint if exists progress_events_kind_check;
alter table public.progress_events add constraint progress_events_kind_check check (kind in ('energy', 'full_day', 'program'));

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

drop table if exists public.daily_goals;
drop function if exists public.daily_goals_guard();

revoke update (life_profile) on public.profiles from authenticated;
alter table public.profiles drop column if exists life_profile;
