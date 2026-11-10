-- Undoes 20261109180000_reward_redemptions.sql. Run by hand only if that migration has to be undone.
-- WARNING: this deletes the redemption records, so spent points would count as available again.
-- Take a backup first (scripts/db-backup.ts). Points earned, rewards and unlocks are untouched.

-- my_points_summary as it was before (from 20261108090000_points_rewards.sql).
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

drop function if exists public.redeem_reward(text, text);
drop function if exists public.points_balance(uuid);
drop table if exists public.reward_redemptions;
