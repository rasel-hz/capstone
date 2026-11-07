-- Points and rewards. Additive and safe to run more than once.
--
-- Points are separate from the app's XP. They are awarded only by the functions below, which run in the
-- database with the caller's verified Supabase identity, so the browser can't write points, unlock rewards
-- or edit the reward catalog. Points are never deducted, and rewards unlock permanently once lifetime
-- points reach their threshold. These are demonstration rewards: nothing here issues a voucher.

-- Reward catalog. Read-only for users.
create table if not exists public.rewards (
  id text primary key,
  brand_ar text not null,
  brand_en text not null,
  title_ar text not null,
  title_en text not null,
  cta_ar text not null,
  cta_en text not null,
  required_points integer not null check (required_points > 0),
  category text not null check (category in ('coffee', 'shopping', 'entertainment')),
  website_url text not null check (website_url ~ '^https://[a-z0-9.-]+\.[a-z]{2,}/'),
  -- The logo as published on the brand's own website. Null shows a plain text badge instead.
  logo_url text check (logo_url is null or logo_url ~ '^https://'),
  accent_color text not null default '#28785B' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  -- Behind the logo. Some official logos are white and need a dark background. Null uses a light tint.
  logo_background text check (logo_background is null or logo_background ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- A challenge the user started. The start time is set by the database, so a completion can be checked
-- against real elapsed time instead of trusting the browser.
alter table public.rewards add column if not exists logo_background text
  check (logo_background is null or logo_background ~ '^#[0-9A-Fa-f]{6}$');

create table if not exists public.challenge_attempts (
  user_id uuid not null references auth.users (id) on delete cascade,
  attempt_key text not null check (attempt_key ~ '^[A-Za-z0-9:_-]{3,80}$'),
  mission_key text not null check (mission_key ~ '^[A-Za-z0-9_-]{2,60}$'),
  challenge_id text not null check (challenge_id ~ '^[a-z0-9_]{2,40}$'),
  is_daily boolean not null default false,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, attempt_key)
);
create index if not exists challenge_attempts_mission on public.challenge_attempts (user_id, mission_key);

-- Every point ever earned. Positive only; the award key makes each award happen once.
create table if not exists public.point_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  points integer not null check (points > 0),
  source text not null check (source in ('challenge', 'daily_mission')),
  award_key text not null,
  challenge_id text,
  mission_key text,
  created_at timestamptz not null default now(),
  constraint point_transactions_award_once unique (user_id, award_key)
);
create index if not exists point_transactions_user_time on public.point_transactions (user_id, created_at);

-- Permanent unlocks. celebrated_at records that the one-time celebration was shown.
create table if not exists public.user_reward_unlocks (
  user_id uuid not null references auth.users (id) on delete cascade,
  reward_id text not null references public.rewards (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  celebrated_at timestamptz,
  primary key (user_id, reward_id)
);

-- Seed the four demonstration rewards. Re-running refreshes their details and keeps everyone's unlocks.
insert into public.rewards (id, brand_ar, brand_en, title_ar, title_en, cta_ar, cta_en, required_points, category, website_url, logo_url, accent_color, logo_background, sort_order)
values
  ('dunkin', 'دانكن', 'Dunkin', 'قهوة من دانكن ☕', 'A coffee from Dunkin ☕', 'خذ قهوتك ☕', 'Get your coffee ☕', 40, 'coffee',
   'https://www.dunkinksa.com/', 'https://www.dunkinksa.com/assets/images/logo-main.svg?v=4', '#E8590C', null, 1),
  ('jarir', 'مكتبة جرير', 'Jarir Bookstore', 'قسيمة كتب من جرير 📚', 'A Jarir book voucher 📚', 'شوف مكافأتك 🎁', 'See your reward 🎁', 80, 'shopping',
   'https://www.jarir.com/', 'https://www.jarir.com/assets/images/logo/jarir.svg', '#D71920', null, 2),
  ('vox', 'ڤوكس سينما', 'VOX Cinemas', 'تذكرة سينما 🎬', 'A cinema ticket 🎬', 'خذ مكافأتك 🎟️', 'Get your reward 🎟️', 120, 'entertainment',
   'https://ksa.voxcinemas.com/', null, '#5B2C83', null, 3),
  ('extra', 'إكسترا', 'eXtra', 'قسيمة تسوق من إكسترا 🎧', 'An eXtra shopping voucher 🎧', 'شوف مكافأتك 🎁', 'See your reward 🎁', 150, 'shopping',
   'https://www.extra.com/', 'https://www.extra.com/_ui/responsive/theme-extra/images/logo-extra.png', '#F26522', '#1F2A44', 4)
on conflict (id) do update set
  brand_ar = excluded.brand_ar, brand_en = excluded.brand_en, title_ar = excluded.title_ar, title_en = excluded.title_en,
  cta_ar = excluded.cta_ar, cta_en = excluded.cta_en, required_points = excluded.required_points, category = excluded.category,
  website_url = excluded.website_url, accent_color = excluded.accent_color, sort_order = excluded.sort_order,
  logo_background = coalesce(public.rewards.logo_background, excluded.logo_background);
-- logo_url is left out of the update on purpose, so a logo set later in the dashboard isn't overwritten.

-- Row Level Security: users read the active catalog and only their own points and unlocks. Nobody writes
-- through the API; all writes go through the functions below.
alter table public.rewards enable row level security;
alter table public.challenge_attempts enable row level security;
alter table public.point_transactions enable row level security;
alter table public.user_reward_unlocks enable row level security;

drop policy if exists "rewards_read_active" on public.rewards;
create policy "rewards_read_active" on public.rewards for select to authenticated using (active);
drop policy if exists "points_read_own" on public.point_transactions;
create policy "points_read_own" on public.point_transactions for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "unlocks_read_own" on public.user_reward_unlocks;
create policy "unlocks_read_own" on public.user_reward_unlocks for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.rewards, public.challenge_attempts, public.point_transactions, public.user_reward_unlocks from anon, authenticated;
grant select on public.rewards, public.point_transactions, public.user_reward_unlocks to authenticated;

-- The day in Saudi Arabia, for "today's points".
create or replace function public.riyadh_day(ts timestamptz)
returns date language sql stable set search_path = '' as $$
  select (ts at time zone 'Asia/Riyadh')::date
$$;

-- Unlocks every active reward whose threshold the user's lifetime points have reached. Never removes one.
create or replace function public.sync_reward_unlocks(p_user uuid)
returns void language sql security definer set search_path = '' as $$
  insert into public.user_reward_unlocks (user_id, reward_id)
  select p_user, r.id
  from public.rewards r
  where r.active
    and r.required_points <= (select coalesce(sum(t.points), 0) from public.point_transactions t where t.user_id = p_user)
  on conflict (user_id, reward_id) do nothing
$$;

-- What the rewards page shows. Computed from the transaction log, never stored as a balance.
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

-- Called when a challenge starts. Repeating it (for example after a resume) keeps the first start time.
create or replace function public.start_challenge_attempt(p_attempt_key text, p_mission_key text, p_challenge_id text, p_daily boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  insert into public.challenge_attempts (user_id, attempt_key, mission_key, challenge_id, is_daily)
  values (uid, p_attempt_key, p_mission_key, p_challenge_id, coalesce(p_daily, false))
  on conflict (user_id, attempt_key) do nothing;
end;
$$;

-- Called when a challenge is completed. Awards 10 points once per attempt, if the attempt was started on
-- the server at least 3 seconds earlier. Self-report activities earn nothing, as everywhere else in the app.
-- At most 30 challenge awards a day, which no genuine day of play reaches, so a script can't farm points.
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

-- Called when a daily mission is finished with every challenge completed. Awards 20 bonus points once per
-- mission, at most once a day, and only if the server recorded at least three completed daily challenges in it.
create or replace function public.claim_daily_mission_bonus(p_mission_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  done_count integer;
  open_count integer;
  awarded integer := 0;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  select count(*) filter (where completed_at is not null and is_daily), count(*) filter (where completed_at is null or not is_daily)
    into done_count, open_count
    from public.challenge_attempts where user_id = uid and mission_key = p_mission_key;
  if done_count >= 3 and open_count = 0
     and not exists (select 1 from public.point_transactions
                     where user_id = uid and source = 'daily_mission' and public.riyadh_day(created_at) = public.riyadh_day(now())) then
    insert into public.point_transactions (user_id, points, source, award_key, mission_key)
    values (uid, 20, 'daily_mission', 'mission:' || p_mission_key, p_mission_key)
    on conflict on constraint point_transactions_award_once do nothing;
    get diagnostics awarded = row_count;
  end if;
  perform public.sync_reward_unlocks(uid);
  return jsonb_build_object('awarded', awarded * 20) || public.my_points_summary();
end;
$$;

-- Records that the newly unlocked rewards were celebrated, so the celebration plays once.
create or replace function public.mark_rewards_celebrated()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  update public.user_reward_unlocks set celebrated_at = now() where user_id = auth.uid() and celebrated_at is null;
end;
$$;

-- Only signed-in users may call the public functions. The unlock helper is internal.
revoke execute on function public.sync_reward_unlocks(uuid) from public, anon, authenticated;
revoke execute on function public.my_points_summary(), public.start_challenge_attempt(text, text, text, boolean),
  public.complete_challenge_attempt(text), public.claim_daily_mission_bonus(text), public.mark_rewards_celebrated() from public, anon;
grant execute on function public.my_points_summary(), public.start_challenge_attempt(text, text, text, boolean),
  public.complete_challenge_attempt(text), public.claim_daily_mission_bonus(text), public.mark_rewards_celebrated() to authenticated;
