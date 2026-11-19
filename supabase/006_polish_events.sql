-- =============================================================================
-- DashMaxx migration 006: editing matches, profile avatars, events + RSVPs,
-- realtime everywhere.
-- Paste into Supabase → SQL Editor → Run. Safe to re-run.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Profiles: emoji avatar + colour (users can edit only these + username)
-- -----------------------------------------------------------------------------
alter table public.profiles add column if not exists avatar_emoji text check (char_length(avatar_emoji) <= 16);
alter table public.profiles add column if not exists avatar_color text not null default 'indigo';

alter table public.profiles drop constraint if exists profiles_avatar_color_check;
alter table public.profiles add  constraint profiles_avatar_color_check
  check (avatar_color in ('indigo', 'violet', 'fuchsia', 'rose', 'orange', 'amber', 'emerald', 'sky'));

revoke update on public.profiles from authenticated;
grant update (username, avatar_emoji, avatar_color) on public.profiles to authenticated;


-- -----------------------------------------------------------------------------
-- Editing matches: owner (who logged it) or admin can update the match and
-- replace its player stats.
-- -----------------------------------------------------------------------------

-- Overwatch
drop policy if exists "ow_matches: update own or admin" on public.ow_matches;
create policy "ow_matches: update own or admin" on public.ow_matches
  for update to authenticated
  using (created_by = (select auth.uid()) or (select public.is_admin()))
  with check (true);
grant update (map, result, season, mode, queue) on public.ow_matches to authenticated;

drop policy if exists "ow_match_stats: insert for own" on public.ow_match_stats;
create policy "ow_match_stats: insert for own" on public.ow_match_stats
  for insert to authenticated
  with check ((select public.is_admin()) or exists (
    select 1 from public.ow_matches m where m.id = match_id and m.created_by = (select auth.uid())
  ));

drop policy if exists "ow_match_stats: delete own or admin" on public.ow_match_stats;
create policy "ow_match_stats: delete own or admin" on public.ow_match_stats
  for delete to authenticated
  using ((select public.is_admin()) or exists (
    select 1 from public.ow_matches m where m.id = match_id and m.created_by = (select auth.uid())
  ));
grant delete on public.ow_match_stats to authenticated;

-- Fortnite
drop policy if exists "fn_matches: update own or admin" on public.fn_matches;
create policy "fn_matches: update own or admin" on public.fn_matches
  for update to authenticated
  using (created_by = (select auth.uid()) or (select public.is_admin()))
  with check (true);
grant update (won, dropped_together, mode, fill, team_size) on public.fn_matches to authenticated;

drop policy if exists "fn_match_stats: insert for own" on public.fn_match_stats;
create policy "fn_match_stats: insert for own" on public.fn_match_stats
  for insert to authenticated
  with check ((select public.is_admin()) or exists (
    select 1 from public.fn_matches m where m.id = match_id and m.created_by = (select auth.uid())
  ));

drop policy if exists "fn_match_stats: delete own or admin" on public.fn_match_stats;
create policy "fn_match_stats: delete own or admin" on public.fn_match_stats
  for delete to authenticated
  using ((select public.is_admin()) or exists (
    select 1 from public.fn_matches m where m.id = match_id and m.created_by = (select auth.uid())
  ));
grant delete on public.fn_match_stats to authenticated;


-- -----------------------------------------------------------------------------
-- Event Countdown (admins create) + RSVPs (everyone)
-- -----------------------------------------------------------------------------
create table if not exists public.events (
  id         bigint generated always as identity primary key,
  title      text not null check (char_length(title) between 1 and 80),
  details    text check (char_length(details) <= 200),
  starts_at  timestamptz not null,
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists events_created_at_idx on public.events (created_at desc);

create table if not exists public.event_rsvps (
  event_id   bigint not null references public.events (id) on delete cascade,
  user_id    uuid   not null default auth.uid() references public.profiles (id) on delete cascade,
  status     text   not null check (status in ('in', 'maybe', 'out')),
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table public.events      enable row level security;
alter table public.event_rsvps enable row level security;

drop policy if exists "events: read"         on public.events;
drop policy if exists "events: admin insert" on public.events;
drop policy if exists "events: admin update" on public.events;
drop policy if exists "events: admin delete" on public.events;
create policy "events: read" on public.events
  for select to authenticated using (true);
create policy "events: admin insert" on public.events
  for insert to authenticated with check ((select public.is_admin()) and created_by = (select auth.uid()));
create policy "events: admin update" on public.events
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "events: admin delete" on public.events
  for delete to authenticated using ((select public.is_admin()));

drop policy if exists "event_rsvps: read"       on public.event_rsvps;
drop policy if exists "event_rsvps: insert own" on public.event_rsvps;
drop policy if exists "event_rsvps: update own" on public.event_rsvps;
drop policy if exists "event_rsvps: delete own" on public.event_rsvps;
create policy "event_rsvps: read" on public.event_rsvps
  for select to authenticated using (true);
create policy "event_rsvps: insert own" on public.event_rsvps
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "event_rsvps: update own" on public.event_rsvps
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "event_rsvps: delete own" on public.event_rsvps
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.events      to authenticated;
grant select, insert, update, delete on public.event_rsvps to authenticated;


-- -----------------------------------------------------------------------------
-- Realtime: live updates for every gadget's tables
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'ow_matches', 'ow_match_stats', 'fn_matches', 'fn_match_stats',
    'squad_schedule', 'squad_bounties', 'squad_goals', 'quotes', 'quote_likes',
    'fortnite_sprites', 'sprite_collection', 'events', 'event_rsvps',
    'squad_status', 'shoutbox_messages'
  ] loop
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
