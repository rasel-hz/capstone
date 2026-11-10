-- Points become a balance: using a reward spends its points, like paying for it. Earned points stay in the
-- transaction log as positive rows; a redemption adds one negative row, so the balance is still the sum of
-- the log and is never stored. Lifetime and today's points count earnings only.
-- Safe to run again: constraints are dropped before being re-added, and everything else is if-not-exists or replace.

alter table public.point_transactions drop constraint if exists point_transactions_points_check;
alter table public.point_transactions drop constraint if exists point_transactions_source_check;
alter table public.point_transactions add constraint point_transactions_source_check
  check (source in ('challenge', 'daily_mission', 'redeem'));
alter table public.point_transactions add constraint point_transactions_points_check
  check ((source = 'redeem' and points < 0) or (source <> 'redeem' and points > 0));

-- One row per reward used, with the price paid at the time.
create table if not exists public.reward_redemptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  reward_id text not null references public.rewards (id),
  points integer not null check (points > 0),
  created_at timestamptz not null default now()
);
create index if not exists reward_redemptions_user_time on public.reward_redemptions (user_id, created_at);

alter table public.reward_redemptions enable row level security;
drop policy if exists "redemptions_read_own" on public.reward_redemptions;
create policy "redemptions_read_own" on public.reward_redemptions for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.reward_redemptions from anon, authenticated;
grant select on public.reward_redemptions to authenticated;

-- Celebration unlocks follow points earned, not the balance, so spending never "re-locks" a celebration.
create or replace function public.sync_reward_unlocks(p_user uuid)
returns void language sql security definer set search_path = '' as $$
  insert into public.user_reward_unlocks (user_id, reward_id)
  select p_user, r.id
  from public.rewards r
  where r.active
    and r.required_points <= (select coalesce(sum(t.points), 0) from public.point_transactions t where t.user_id = p_user and t.points > 0)
  on conflict (user_id, reward_id) do nothing
$$;

-- What the rewards page shows. balance is what can be spent now; lifetime and today count earnings only.
create or replace function public.my_points_summary()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  perform public.sync_reward_unlocks(uid);
  return jsonb_build_object(
    'lifetime', (select coalesce(sum(points), 0) from public.point_transactions where user_id = uid and points > 0),
    'balance', (select coalesce(sum(points), 0) from public.point_transactions where user_id = uid),
    'today', (select coalesce(sum(points), 0) from public.point_transactions
              where user_id = uid and points > 0 and public.riyadh_day(created_at) = public.riyadh_day(now())),
    'unlocks', coalesce((select jsonb_agg(jsonb_build_object('reward_id', reward_id, 'unlocked_at', unlocked_at, 'celebrated', celebrated_at is not null))
                         from public.user_reward_unlocks where user_id = uid), '[]'::jsonb),
    'redemptions', coalesce((select jsonb_agg(jsonb_build_object('reward_id', reward_id, 'points', points, 'at', created_at) order by created_at desc)
                             from (select * from public.reward_redemptions where user_id = uid order by created_at desc limit 20) r), '[]'::jsonb)
  );
end;
$$;

-- Spends a reward's points. A per-user lock stops two quick taps from spending the same points twice.
create or replace function public.redeem_reward(p_reward text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  cost integer;
  bal integer;
  rid bigint;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  select required_points into cost from public.rewards where id = p_reward and active;
  if cost is null then raise exception 'reward_not_found' using errcode = 'P0002'; end if;
  perform pg_advisory_xact_lock(hashtext('redeem:' || uid::text));
  select coalesce(sum(points), 0) into bal from public.point_transactions where user_id = uid;
  if bal < cost then raise exception 'not_enough_points' using errcode = 'P0001'; end if;
  insert into public.reward_redemptions (user_id, reward_id, points) values (uid, p_reward, cost) returning id into rid;
  insert into public.point_transactions (user_id, points, source, award_key) values (uid, -cost, 'redeem', 'redeem:' || rid);
  return jsonb_build_object('redeemed', p_reward, 'spent', cost) || public.my_points_summary();
end;
$$;

revoke execute on function public.redeem_reward(text) from public, anon;
grant execute on function public.redeem_reward(text) to authenticated;
revoke execute on function public.sync_reward_unlocks(uuid) from public, anon, authenticated;
