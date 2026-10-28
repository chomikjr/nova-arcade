-- ============================================================================
-- Nova Arcade — Supabase schema
-- Run once in the Supabase SQL editor (already applied to the live project).
-- After running, register the owner account (gets Pro + owner role, and is the
-- only account allowed to use the reserved username "Ryan"):
--     insert into public.app_owner(email) values ('you@example.com');
-- Keep that email out of this public repo — run it in the dashboard only.
-- ============================================================================

-- Owner allow-list. RLS on + no policies = invisible to the public API.
create table if not exists public.app_owner (email text primary key);
alter table public.app_owner enable row level security;

-- Public profile for every account
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null check (username ~ '^[A-Za-z0-9_]{3,18}$'),
  hue         int  not null default floor(random() * 360),
  plan        text not null default 'free'   check (plan in ('free', 'pro')),
  role        text not null default 'player' check (role in ('player', 'owner')),
  created_at  timestamptz not null default now()
);
create unique index if not exists profiles_username_lower on public.profiles (lower(username));
alter table public.profiles enable row level security;
create policy "Profiles are public" on public.profiles for select using (true);
create policy "Users update their own profile" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Players can edit their profile, but never their own plan or role.
create or replace function public.protect_profile_fields() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (new.plan is distinct from old.plan or new.role is distinct from old.role or new.id is distinct from old.id)
     and coalesce(auth.role(), '') in ('anon', 'authenticated') then
    raise exception 'plan and role can only be changed by the server';
  end if;
  return new;
end $$;
drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- Everything a player saves: settings, per-game options, stats, game saves
create table if not exists public.player_data (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb check (pg_column_size(data) < 2000000),
  updated_at  timestamptz not null default now()
);
alter table public.player_data enable row level security;
create policy "Read own data"   on public.player_data for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own data" on public.player_data for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own data" on public.player_data for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Best scores, for the global leaderboard
create table if not exists public.scores (
  user_id     uuid not null references auth.users(id) on delete cascade,
  game_id     text not null check (char_length(game_id) <= 40),
  best        bigint not null default 0 check (best between 0 and 100000000),
  plays       int not null default 0 check (plays >= 0),
  updated_at  timestamptz not null default now(),
  primary key (user_id, game_id)
);
create index if not exists scores_game_best on public.scores (game_id, best desc);
alter table public.scores enable row level security;
create policy "Scores are public"   on public.scores for select using (true);
create policy "Insert own scores"   on public.scores for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own scores"   on public.scores for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create or replace view public.leaderboard with (security_invoker = true) as
  select s.game_id, s.user_id, p.username, p.hue, s.best, s.plays
  from public.scores s join public.profiles p on p.id = s.user_id;

-- Create the profile + data row when someone signs up
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  uname    text    := coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1));
  is_owner boolean := exists (select 1 from public.app_owner o where lower(o.email) = lower(new.email));
begin
  if lower(uname) = 'ryan' and not is_owner then
    raise exception 'username reserved';
  end if;
  insert into public.profiles (id, username, plan, role)
  values (new.id, uname,
          case when is_owner then 'pro'   else 'free'   end,
          case when is_owner then 'owner' else 'player' end);
  insert into public.player_data (user_id) values (new.id);
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lets the sign-up form check a name before submitting
create or replace function public.username_available(u text) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(u));
$$;
grant execute on function public.username_available(text) to anon, authenticated;

-- If the owner email is added after the owner already signed up, promote them
create or replace function public.sync_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles p set plan = 'pro', role = 'owner'
  from auth.users u where u.id = p.id and lower(u.email) = lower(new.email);
  return new;
end $$;
revoke execute on function public.sync_owner() from public, anon, authenticated;
drop trigger if exists on_owner_added on public.app_owner;
create trigger on_owner_added after insert on public.app_owner
  for each row execute function public.sync_owner();
