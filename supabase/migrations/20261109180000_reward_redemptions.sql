-- Redeeming a reward spends its points. Additive only: point_transactions, rewards and unlocks are not
-- changed, and no existing row is touched. Rollback: supabase/rollbacks/20261109180000_reward_redemptions.down.sql.
--
-- The spendable balance is every point earned (point_transactions) minus every point redeemed here.
-- "Lifetime" in my_points_summary keeps meaning what it always did: points ever earned.

create table if not exists public.reward_redemptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  reward_id text not null references public.rewards (id),
  -- The reward's price when it was redeemed, so a later price change never rewrites history.
  points integer not null check (points > 0),
  -- One key per confirmation in the app. Sending the same key again never charges twice.
  request_key text not null check (request_key ~ '^[A-Za-z0-9_-]{8,64}$'),
  -- The link the user was sent to, so it can be reopened later without paying again.
  website_url text not null,
  created_at timestamptz not null default now(),
  unique (user_id, request_key)
);
create index if not exists reward_redemptions_user on public.reward_redemptions (user_id, created_at);

alter table public.reward_redemptions enable row level security;
drop policy if exists "redemptions_read_own" on public.reward_redemptions;
create policy "redemptions_read_own" on public.reward_redemptions for select to authenticated using ((select auth.uid()) = user_id);
-- No insert, update or delete for users: rows are written only by redeem_reward below.
revoke all on public.reward_redemptions from anon, authenticated;
grant select on public.reward_redemptions to authenticated;

-- Points earned minus points redeemed. Internal: users read it through my_points_summary.
create or replace function public.points_balance(p_user uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select (coalesce((select sum(t.points) from public.point_transactions t where t.user_id = p_user), 0)
        - coalesce((select sum(r.points) from public.reward_redemptions r where r.user_id = p_user), 0))::integer
$$;
revoke execute on function public.points_balance(uuid) from public, anon, authenticated;

-- Redeems one reward. Checks and spends in one transaction, under a per-user lock, so two quick taps or two
-- devices can't spend the same points twice and the balance can never go below zero.
create or replace function public.redeem_reward(p_reward_id text, p_request_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  r public.rewards;
  prior public.reward_redemptions;
  bal integer;
  new_id bigint;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if p_request_key is null or p_request_key !~ '^[A-Za-z0-9_-]{8,64}$' then raise exception 'invalid_request_key' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('redeem:' || uid::text, 0));

  -- The same confirmation sent again: report what already happened, charge nothing.
  select * into prior from public.reward_redemptions where user_id = uid and request_key = p_request_key;
  if found then
    if prior.reward_id <> p_reward_id then raise exception 'request_key_reused' using errcode = '22023'; end if;
    return jsonb_build_object('status', 'already', 'redemption_id', prior.id, 'reward_id', prior.reward_id, 'points', prior.points,
      'url', prior.website_url, 'redeemed_at', prior.created_at, 'balance', public.points_balance(uid));
  end if;

  select * into r from public.rewards where id = p_reward_id and active;
  if not found then raise exception 'reward_not_found' using errcode = '22023'; end if;

  bal := public.points_balance(uid);
  if bal < r.required_points then
    return jsonb_build_object('status', 'insufficient', 'reward_id', r.id, 'required', r.required_points, 'balance', bal);
  end if;

  insert into public.reward_redemptions (user_id, reward_id, points, request_key, website_url)
  values (uid, r.id, r.required_points, p_request_key, r.website_url)
  returning id into new_id;

  return jsonb_build_object('status', 'redeemed', 'redemption_id', new_id, 'reward_id', r.id, 'points', r.required_points,
    'url', r.website_url, 'redeemed_at', now(), 'balance', bal - r.required_points);
end;
$$;
revoke execute on function public.redeem_reward(text, text) from public, anon;
grant execute on function public.redeem_reward(text, text) to authenticated;

-- The rewards page summary, now with the spendable balance and the user's redemptions. Existing keys keep
-- their meaning: lifetime is points ever earned, today is points earned today.
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
                         from public.user_reward_unlocks where user_id = uid), '[]'::jsonb),
    'balance', public.points_balance(uid),
    'spent', (select coalesce(sum(points), 0) from public.reward_redemptions where user_id = uid),
    'redemptions', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'reward_id', x.reward_id, 'points', x.points, 'url', x.website_url, 'redeemed_at', x.created_at) order by x.created_at desc)
                             from (select * from public.reward_redemptions where user_id = uid order by created_at desc limit 50) x), '[]'::jsonb)
  );
end;
$$;
