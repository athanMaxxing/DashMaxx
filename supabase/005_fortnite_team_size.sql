-- =============================================================================
-- DashMaxx migration 005: Fortnite team size (Solo / Duo / Trio / Squad)
-- Paste into Supabase → SQL Editor → Run. Safe to re-run.
-- =============================================================================

alter table public.fn_matches add column if not exists team_size smallint;

-- Backfill existing games from how many squad members were logged (max 4).
update public.fn_matches m
set team_size = least(4, greatest(1, (select count(*) from public.fn_match_stats s where s.match_id = m.id)))
where team_size is null;

alter table public.fn_matches alter column team_size set default 4;
alter table public.fn_matches alter column team_size set not null;

alter table public.fn_matches drop constraint if exists fn_matches_team_size_check;
alter table public.fn_matches add  constraint fn_matches_team_size_check check (team_size between 1 and 4);

-- Block saving more players than the team size allows (e.g. 4 players in a Solo game).
create or replace function public.fn_check_team_size()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  max_players smallint;
  current_players int;
begin
  select team_size into max_players from public.fn_matches where id = new.match_id;
  select count(*) into current_players from public.fn_match_stats where match_id = new.match_id;
  if current_players >= max_players then
    raise exception 'This game is % (max % player%) — remove a player or pick a bigger team size.',
      case max_players when 1 then 'Solo' when 2 then 'Duos' when 3 then 'Trios' else 'Squads' end,
      max_players, case when max_players = 1 then '' else 's' end;
  end if;
  return new;
end;
$$;

drop trigger if exists fn_match_stats_team_size on public.fn_match_stats;
create trigger fn_match_stats_team_size
  before insert on public.fn_match_stats
  for each row execute function public.fn_check_team_size();
