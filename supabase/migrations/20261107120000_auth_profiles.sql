-- Khowayk accounts: one profile per Supabase Auth user.
-- Supabase Auth (auth.users) is the identity source and holds the email and password hash.
-- This table holds only what the app needs to greet a returning user and know whether onboarding is done.
-- Safe to run more than once.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  first_name text not null,
  -- How the app addresses the user in Arabic, collected on the same step as the first name.
  address_form text not null default 'm',
  -- Null until the user finishes onboarding.
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_.]{3,20}$'),
  constraint profiles_first_name_length check (char_length(btrim(first_name)) between 1 and 40),
  constraint profiles_address_form check (address_form in ('m', 'f'))
);

-- Usernames are stored in lowercase (enforced above), so this makes them unique regardless of case.
create unique index if not exists profiles_username_key on public.profiles (username);

-- Keep updated_at current.
create or replace function public.profiles_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.profiles_touch_updated_at();

-- Create the profile in the same transaction as the auth user, so an account never exists without one.
-- If the username is already taken, the unique index fails and Supabase rejects the whole sign-up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uname text := lower(btrim(new.raw_user_meta_data ->> 'username'));
begin
  -- Accounts created some other way (for example from the dashboard) get no profile.
  if uname is null or uname = '' then
    return new;
  end if;
  insert into public.profiles (id, username, first_name, address_form)
  values (
    new.id,
    uname,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'first_name'), ''), uname),
    case when new.raw_user_meta_data ->> 'address_form' = 'f' then 'f' else 'm' end
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security: a signed-in user can read and update only their own row.
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No access for signed-out visitors. Signed-in users may change only these columns,
-- so the username, ID and creation time can't be edited from the browser. Rows are created only by the trigger.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (first_name, address_form, onboarding_completed_at) on public.profiles to authenticated;
