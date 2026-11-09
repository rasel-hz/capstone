-- Undoes 20261110090000_reward_redemptions: points go back to never being spent.
-- This deletes every redemption and its negative point row, so spent points come back to each balance.
-- Take a backup first (npm run db:backup -- <folder>), and remove the migration file before running db:migrate again.

drop function if exists public.redeem_reward(text);

delete from public.point_transactions where source = 'redeem';
drop table if exists public.reward_redemptions;

alter table public.point_transactions drop constraint if exists point_transactions_points_check;
alter table public.point_transactions drop constraint if exists point_transactions_source_check;
alter table public.point_transactions add constraint point_transactions_source_check
  check (source in ('challenge', 'daily_mission'));
alter table public.point_transactions add constraint point_transactions_points_check check (points > 0);

create or replace function public.sync_reward_unlocks(p_user uuid)
returns void language sql security definer set search_path = '' as $$
  insert into public.user_reward_unlocks (user_id, reward_id)
  select p_user, r.id
  from public.rewards r
  where r.active
    and r.required_points <= (select coalesce(sum(t.points), 0) from public.point_transactions t where t.user_id = p_user)
  on conflict (user_id, reward_id) do nothing
$$;

create or replace function public.my_points_summary()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  perform public.sync_reward_unlocks(uid);
  return jsonb_build_object(
    'lifetime', (select coalesce(sum(points), 0) from public.point_transactions where user_id = uid),
    'today', (select coalesce(sum(points), 0) from public.point_transactions
              where user_id = uid and public.riyadh_day(created_at) = public.riyadh_day(now())),
    'unlocks', coalesce((select jsonb_agg(jsonb_build_object('reward_id', reward_id, 'unlocked_at', unlocked_at, 'celebrated', celebrated_at is not null))
                         from public.user_reward_unlocks where user_id = uid), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.sync_reward_unlocks(uuid) from public, anon, authenticated;
