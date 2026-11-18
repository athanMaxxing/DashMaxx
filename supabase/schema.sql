-- =============================================================================
-- DashMaxx database schema
-- Paste into Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run: functions, triggers and policies are replaced; tables are
-- only created if missing.
--
-- If you already created these tables with DIFFERENT columns, `create table if
-- not exists` will keep your old versions. In that case uncomment the DROP block
-- below first. WARNING: that permanently deletes all rows in those tables.
-- =============================================================================

-- drop table if exists public.squad_bounties cascade;
-- drop table if exists public.squad_schedule cascade;
-- drop table if exists public.ow_match_stats cascade;
-- drop table if exists public.ow_matches cascade;
-- drop table if exists public.profiles cascade;


-- -----------------------------------------------------------------------------
-- profiles: one row per auth user, created automatically on signup
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  username   text not null unique check (char_length(username) between 1 and 32),
  created_at timestamptz not null default now()
);

-- Reads options.data.username from supabase.auth.signUp().
-- Falls back to the email prefix, and adds a suffix if the name is taken,
-- so a duplicate username never blocks signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_name text;
  final_name text;
begin
  base_name := left(coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
    split_part(new.email, '@', 1),
    'player'
  ), 27);
  final_name := base_name;

  while exists (select 1 from public.profiles where username = final_name) loop
    final_name := base_name || '_' || substr(md5(random()::text), 1, 4);
  end loop;

  insert into public.profiles (id, username) values (new.id, final_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for users who signed up before the trigger existed.
insert into public.profiles (id, username)
select u.id,
       left(coalesce(nullif(trim(u.raw_user_meta_data ->> 'username'), ''), split_part(u.email, '@', 1)), 27)
         || '_' || substr(md5(u.id::text), 1, 4)
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict do nothing;


-- -----------------------------------------------------------------------------
-- Overwatch: matches + per-player stats
-- -----------------------------------------------------------------------------
create table if not exists public.ow_matches (
  id         bigint generated always as identity primary key,
  map        text not null,
  result     text not null check (result in ('win', 'loss')),
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists ow_matches_created_at_idx on public.ow_matches (created_at desc);

create table if not exists public.ow_match_stats (
  id           bigint generated always as identity primary key,
  match_id     bigint not null references public.ow_matches (id) on delete cascade,
  player_id    uuid   not null references public.profiles (id) on delete cascade,
  hero         text,
  eliminations integer check (eliminations >= 0),
  deaths       integer check (deaths >= 0),
  damage       integer check (damage >= 0),
  healing      integer check (healing >= 0),
  unique (match_id, player_id)
);

create index if not exists ow_match_stats_match_idx  on public.ow_match_stats (match_id);
create index if not exists ow_match_stats_player_idx on public.ow_match_stats (player_id);


-- -----------------------------------------------------------------------------
-- Scheduling matrix: day_of_week 0 = Monday … 6 = Sunday
-- The primary key doubles as the unique constraint the app's upsert targets.
-- -----------------------------------------------------------------------------
create table if not exists public.squad_schedule (
  user_id     uuid     not null default auth.uid() references public.profiles (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  status      text check (status in ('green', 'yellow', 'red')),  -- null = unknown
  updated_at  timestamptz not null default now(),
  primary key (user_id, day_of_week)
);


-- -----------------------------------------------------------------------------
-- Bounty board
-- -----------------------------------------------------------------------------
create table if not exists public.squad_bounties (
  id          bigint generated always as identity primary key,
  game        text not null,
  description text not null,
  created_by  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  claimed_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists squad_bounties_created_at_idx on public.squad_bounties (created_at desc);


-- -----------------------------------------------------------------------------
-- Row Level Security
-- Everyone signed in can read everything (it's a squad dashboard);
-- you can only write your own rows.
-- -----------------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.ow_matches     enable row level security;
alter table public.ow_match_stats enable row level security;
alter table public.squad_schedule enable row level security;
alter table public.squad_bounties enable row level security;

-- profiles
drop policy if exists "profiles: read"       on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: read" on public.profiles
  for select to authenticated using (true);
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ow_matches (delete is used by the app to roll back a match whose stats failed to save)
drop policy if exists "ow_matches: read"       on public.ow_matches;
drop policy if exists "ow_matches: insert own" on public.ow_matches;
drop policy if exists "ow_matches: delete own" on public.ow_matches;
create policy "ow_matches: read" on public.ow_matches
  for select to authenticated using (true);
create policy "ow_matches: insert own" on public.ow_matches
  for insert to authenticated with check (created_by = (select auth.uid()));
create policy "ow_matches: delete own" on public.ow_matches
  for delete to authenticated using (created_by = (select auth.uid()));

-- ow_match_stats: the person who logged the match can add stats for any squad member
drop policy if exists "ow_match_stats: read"            on public.ow_match_stats;
drop policy if exists "ow_match_stats: insert for own"  on public.ow_match_stats;
create policy "ow_match_stats: read" on public.ow_match_stats
  for select to authenticated using (true);
create policy "ow_match_stats: insert for own" on public.ow_match_stats
  for insert to authenticated
  with check (exists (
    select 1 from public.ow_matches m
    where m.id = match_id and m.created_by = (select auth.uid())
  ));

-- squad_schedule (upsert needs both insert and update)
drop policy if exists "squad_schedule: read"       on public.squad_schedule;
drop policy if exists "squad_schedule: insert own" on public.squad_schedule;
drop policy if exists "squad_schedule: update own" on public.squad_schedule;
create policy "squad_schedule: read" on public.squad_schedule
  for select to authenticated using (true);
create policy "squad_schedule: insert own" on public.squad_schedule
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "squad_schedule: update own" on public.squad_schedule
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- squad_bounties
drop policy if exists "squad_bounties: read"       on public.squad_bounties;
drop policy if exists "squad_bounties: insert own" on public.squad_bounties;
drop policy if exists "squad_bounties: claim open" on public.squad_bounties;
drop policy if exists "squad_bounties: delete own" on public.squad_bounties;
create policy "squad_bounties: read" on public.squad_bounties
  for select to authenticated using (true);
create policy "squad_bounties: insert own" on public.squad_bounties
  for insert to authenticated with check (created_by = (select auth.uid()));
-- Anyone can claim an open bounty, but only for themselves.
create policy "squad_bounties: claim open" on public.squad_bounties
  for update to authenticated
  using (claimed_by is null) with check (claimed_by = (select auth.uid()));
create policy "squad_bounties: delete own" on public.squad_bounties
  for delete to authenticated using (created_by = (select auth.uid()));

-- Claiming may only touch claimed_by (stops a claimer editing the text).
revoke update on public.squad_bounties from authenticated;
grant  update (claimed_by) on public.squad_bounties to authenticated;

-- Keep updated_at fresh on schedule changes.
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists squad_schedule_touch on public.squad_schedule;
create trigger squad_schedule_touch
  before update on public.squad_schedule
  for each row execute function public.touch_updated_at();


-- -----------------------------------------------------------------------------
-- Table privileges for signed-in users (newer Supabase projects don't grant
-- these automatically). RLS policies above still decide which ROWS apply.
-- -----------------------------------------------------------------------------
grant usage on schema public to authenticated;

grant select, update (username)  on public.profiles       to authenticated;
grant select, insert, delete     on public.ow_matches     to authenticated;
grant select, insert             on public.ow_match_stats to authenticated;
grant select, insert, update     on public.squad_schedule to authenticated;
grant select, insert, delete     on public.squad_bounties to authenticated;
grant update (claimed_by)        on public.squad_bounties to authenticated;


-- -----------------------------------------------------------------------------
-- Added later: mitigation stat
-- -----------------------------------------------------------------------------
alter table public.ow_match_stats
  add column if not exists mitigation integer check (mitigation >= 0);
