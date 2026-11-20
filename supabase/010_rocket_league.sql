-- =============================================================================
-- DashMaxx migration 010: Rocket League tab
--
--   rl_matches      one row per game: ranked?, team size (1 Duel, 2 Doubles,
--                   3 Standard, 4 Chaos), fill, final score, win/loss
--   rl_match_stats  one row per squad player: goals, assists, saves, points,
--                   MVP and (ranked only) their MMR after the game
--
-- Paste into Supabase → SQL Editor → Run. Safe to re-run.
-- =============================================================================

create table if not exists public.rl_matches (
  id          bigint generated always as identity primary key,
  won         boolean  not null,
  ranked      boolean  not null default true,
  team_size   smallint not null default 2 check (team_size between 1 and 4),
  fill        boolean  not null default false,   -- randoms filled the empty spots
  our_goals   smallint not null default 0 check (our_goals between 0 and 99),
  their_goals smallint not null default 0 check (their_goals between 0 and 99),
  created_by  uuid     not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  -- Chaos (4v4) only exists as a casual playlist.
  constraint rl_matches_chaos_unranked check (not (ranked and team_size = 4))
);

create index if not exists rl_matches_created_at_idx on public.rl_matches (created_at desc);

create table if not exists public.rl_match_stats (
  id        bigint generated always as identity primary key,
  match_id  bigint   not null references public.rl_matches (id) on delete cascade,
  player_id uuid     not null references public.profiles (id) on delete cascade,
  goals     smallint not null default 0 check (goals   >= 0),
  assists   smallint not null default 0 check (assists >= 0),
  saves     smallint not null default 0 check (saves   >= 0),
  score     integer  not null default 0 check (score   >= 0),  -- in-game points
  mvp       boolean  not null default false,
  mmr       integer  check (mmr between 0 and 3000),          -- after the game, ranked only
  unique (match_id, player_id)
);

create index if not exists rl_match_stats_match_idx  on public.rl_match_stats (match_id);
create index if not exists rl_match_stats_player_idx on public.rl_match_stats (player_id);

-- Block more players than the playlist allows (e.g. 3 players in Doubles).
create or replace function public.rl_check_team_size()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  max_players smallint;
  current_players int;
begin
  select team_size into max_players from public.rl_matches where id = new.match_id;
  select count(*) into current_players from public.rl_match_stats where match_id = new.match_id;
  if current_players >= max_players then
    raise exception 'This game is % (max % player%). Remove a player or pick a bigger playlist.',
      case max_players when 1 then 'Duel' when 2 then 'Doubles' when 3 then 'Standard' else 'Chaos' end,
      max_players, case when max_players = 1 then '' else 's' end;
  end if;
  return new;
end;
$$;

drop trigger if exists rl_match_stats_team_size on public.rl_match_stats;
create trigger rl_match_stats_team_size
  before insert on public.rl_match_stats
  for each row execute function public.rl_check_team_size();

-- -----------------------------------------------------------------------------
-- Row Level Security: everyone reads, you manage your own games, admins manage all
-- -----------------------------------------------------------------------------
alter table public.rl_matches     enable row level security;
alter table public.rl_match_stats enable row level security;

drop policy if exists "rl_matches: read"                on public.rl_matches;
drop policy if exists "rl_matches: insert own"          on public.rl_matches;
drop policy if exists "rl_matches: update own or admin" on public.rl_matches;
drop policy if exists "rl_matches: delete own or admin" on public.rl_matches;
create policy "rl_matches: read" on public.rl_matches
  for select to authenticated using (true);
create policy "rl_matches: insert own" on public.rl_matches
  for insert to authenticated with check (created_by = (select auth.uid()));
create policy "rl_matches: update own or admin" on public.rl_matches
  for update to authenticated
  using (created_by = (select auth.uid()) or (select public.is_admin()))
  with check (true);
create policy "rl_matches: delete own or admin" on public.rl_matches
  for delete to authenticated
  using (created_by = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "rl_match_stats: read"                on public.rl_match_stats;
drop policy if exists "rl_match_stats: insert for own"      on public.rl_match_stats;
drop policy if exists "rl_match_stats: delete own or admin" on public.rl_match_stats;
create policy "rl_match_stats: read" on public.rl_match_stats
  for select to authenticated using (true);
create policy "rl_match_stats: insert for own" on public.rl_match_stats
  for insert to authenticated
  with check ((select public.is_admin()) or exists (
    select 1 from public.rl_matches m where m.id = match_id and m.created_by = (select auth.uid())
  ));
create policy "rl_match_stats: delete own or admin" on public.rl_match_stats
  for delete to authenticated
  using ((select public.is_admin()) or exists (
    select 1 from public.rl_matches m where m.id = match_id and m.created_by = (select auth.uid())
  ));

-- This project doesn't auto-grant table access, so grant it explicitly.
grant select, insert, delete on public.rl_matches to authenticated;
grant update (won, ranked, team_size, fill, our_goals, their_goals) on public.rl_matches to authenticated;
grant select, insert, delete on public.rl_match_stats to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant select, insert, update, delete on public.rl_matches, public.rl_match_stats to service_role;

-- -----------------------------------------------------------------------------
-- Live updates
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['rl_matches', 'rl_match_stats'] loop
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
