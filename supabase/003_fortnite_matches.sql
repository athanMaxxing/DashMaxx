-- =============================================================================
-- DashMaxx migration 003: Fortnite match tracker
-- Paste into Supabase → SQL Editor → Run. Safe to re-run.
-- =============================================================================

create table if not exists public.fn_matches (
  id               bigint generated always as identity primary key,
  won              boolean not null,
  dropped_together boolean not null default true,
  mode             text    not null check (char_length(mode) between 1 and 40),
  fill             boolean not null default false,  -- filled with randoms
  created_by       uuid    not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at       timestamptz not null default now()
);

create index if not exists fn_matches_created_at_idx on public.fn_matches (created_at desc);

create table if not exists public.fn_match_stats (
  id        bigint generated always as identity primary key,
  match_id  bigint  not null references public.fn_matches (id) on delete cascade,
  player_id uuid    not null references public.profiles (id) on delete cascade,
  kills     integer not null default 0 check (kills >= 0),
  unique (match_id, player_id)
);

create index if not exists fn_match_stats_match_idx  on public.fn_match_stats (match_id);
create index if not exists fn_match_stats_player_idx on public.fn_match_stats (player_id);

alter table public.fn_matches     enable row level security;
alter table public.fn_match_stats enable row level security;

drop policy if exists "fn_matches: read"       on public.fn_matches;
drop policy if exists "fn_matches: insert own" on public.fn_matches;
drop policy if exists "fn_matches: delete own" on public.fn_matches;
create policy "fn_matches: read" on public.fn_matches
  for select to authenticated using (true);
create policy "fn_matches: insert own" on public.fn_matches
  for insert to authenticated with check (created_by = (select auth.uid()));
create policy "fn_matches: delete own" on public.fn_matches
  for delete to authenticated using (created_by = (select auth.uid()));

drop policy if exists "fn_match_stats: read"           on public.fn_match_stats;
drop policy if exists "fn_match_stats: insert for own" on public.fn_match_stats;
create policy "fn_match_stats: read" on public.fn_match_stats
  for select to authenticated using (true);
create policy "fn_match_stats: insert for own" on public.fn_match_stats
  for insert to authenticated
  with check (exists (
    select 1 from public.fn_matches m
    where m.id = match_id and m.created_by = (select auth.uid())
  ));

grant select, insert, delete on public.fn_matches     to authenticated;
grant select, insert         on public.fn_match_stats to authenticated;
