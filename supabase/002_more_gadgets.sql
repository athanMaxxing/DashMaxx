-- =============================================================================
-- DashMaxx migration 002: more gadgets
--   * Overwatch: season / mode / queue on matches
--   * Ready Check     (squad_status)
--   * Shoutbox        (shoutbox_messages)
--   * Squad Goals     (squad_goals)
--   * Sprite Checklist(fortnite_sprites, sprite_collection) + seed data
-- Paste into Supabase → SQL Editor → Run. Safe to re-run.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Overwatch: season, mode, queue
-- -----------------------------------------------------------------------------
alter table public.ow_matches add column if not exists season text;
alter table public.ow_matches add column if not exists mode   text;
alter table public.ow_matches add column if not exists queue  text not null default 'competitive';

alter table public.ow_matches drop constraint if exists ow_matches_mode_check;
alter table public.ow_matches add  constraint ow_matches_mode_check
  check (mode is null or mode in ('control', 'escort', 'hybrid', 'push', 'flashpoint', 'clash'));
alter table public.ow_matches drop constraint if exists ow_matches_queue_check;
alter table public.ow_matches add  constraint ow_matches_queue_check
  check (queue in ('competitive', 'quickplay'));

-- Backfill: matches logged before this migration were Season 5.
update public.ow_matches set season = 'Season 5' where season is null;

-- Backfill mode from the map name.
update public.ow_matches set mode = case map
  when 'Antarctic Peninsula' then 'control' when 'Busan' then 'control' when 'Ilios' then 'control'
  when 'Lijiang Tower' then 'control' when 'Nepal' then 'control' when 'Oasis' then 'control'
  when 'Samoa' then 'control'
  when 'Circuit Royal' then 'escort' when 'Dorado' then 'escort' when 'Havana' then 'escort'
  when 'Junkertown' then 'escort' when 'Rialto' then 'escort' when 'Route 66' then 'escort'
  when 'Shambali Monastery' then 'escort' when 'Watchpoint: Gibraltar' then 'escort'
  when 'Blizzard World' then 'hybrid' when 'Eichenwalde' then 'hybrid' when 'Hollywood' then 'hybrid'
  when 'King''s Row' then 'hybrid' when 'Midtown' then 'hybrid' when 'Numbani' then 'hybrid'
  when 'Paraíso' then 'hybrid'
  when 'Colosseo' then 'push' when 'Esperança' then 'push' when 'New Queen Street' then 'push'
  when 'Runasapi' then 'push'
  when 'New Junk City' then 'flashpoint' when 'Suravasa' then 'flashpoint' when 'Aatlis' then 'flashpoint'
  when 'Hanaoka' then 'clash' when 'Throne of Anubis' then 'clash'
end
where mode is null;


-- -----------------------------------------------------------------------------
-- Ready Check: one live status row per user
-- -----------------------------------------------------------------------------
create table if not exists public.squad_status (
  user_id    uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  status     text not null check (status in ('online', 'soon', 'later', 'offline')),
  game       text check (char_length(game) <= 40),
  updated_at timestamptz not null default now()
);


-- -----------------------------------------------------------------------------
-- Shoutbox
-- -----------------------------------------------------------------------------
create table if not exists public.shoutbox_messages (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists shoutbox_messages_created_at_idx on public.shoutbox_messages (created_at desc);


-- -----------------------------------------------------------------------------
-- Squad Goals: shared targets anyone can push progress on
-- -----------------------------------------------------------------------------
create table if not exists public.squad_goals (
  id         bigint generated always as identity primary key,
  title      text    not null check (char_length(title) between 1 and 80),
  target     integer not null check (target > 0),
  progress   integer not null default 0 check (progress >= 0),
  created_by uuid    not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);


-- -----------------------------------------------------------------------------
-- Fortnite sprites: shared list (anyone can add) + per-user collection
-- -----------------------------------------------------------------------------
create table if not exists public.fortnite_sprites (
  id         bigint generated always as identity primary key,
  name       text   not null check (char_length(name) between 1 and 60),
  season     text   not null,
  rarity     text   not null check (rarity in ('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic')),
  variants   text[] not null default '{Normal}',
  how_to_get text,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (season, name)
);

create table if not exists public.sprite_collection (
  user_id      uuid   not null default auth.uid() references public.profiles (id) on delete cascade,
  sprite_id    bigint not null references public.fortnite_sprites (id) on delete cascade,
  variant      text   not null default 'Normal',
  collected_at timestamptz not null default now(),
  primary key (user_id, sprite_id, variant)
);

-- Seed: Chapter 7 Mini Season (community-sourced from spritelocker.com, Nov 2026).
insert into public.fortnite_sprites (name, season, rarity, variants, how_to_get, created_by) values
  ('Halfpeel''d',        'Chapter 7 Mini Season', 'rare',      '{Normal,Cursed,Fortune}', 'Chests or supply drops, then extract', null),
  ('Re-Pete',            'Chapter 7 Mini Season', 'rare',      '{Normal,Cursed,Fortune}', 'Chests or supply drops, then extract', null),
  ('Barry O''Fish',      'Chapter 7 Mini Season', 'rare',      '{Normal,Cursed,Fortune}', 'Chests or supply drops, then extract', null),
  ('Wayfinder',          'Chapter 7 Mini Season', 'rare',      '{Normal,Cursed,Fortune}', 'Chests or supply drops, then extract', null),
  ('Chester',            'Chapter 7 Mini Season', 'epic',      '{Normal,Cursed,Fortune}', 'Chests or supply drops, then extract', null),
  ('Kelper',             'Chapter 7 Mini Season', 'epic',      '{Normal,Cursed,Fortune}', 'Chests or supply drops, then extract', null),
  ('Exmarks',            'Chapter 7 Mini Season', 'epic',      '{Normal,Cursed,Fortune}', 'Chests or supply drops, then extract', null),
  ('Lil'' Squibbly',     'Chapter 7 Mini Season', 'epic',      '{Normal,Cursed,Fortune}', 'Chests or supply drops, then extract', null),
  ('Squiplash',          'Chapter 7 Mini Season', 'epic',      '{Normal,Cursed,Fortune}', 'Chests or supply drops, then extract', null),
  ('Transponder Snail',  'Chapter 7 Mini Season', 'legendary', '{Normal}',                'Chests or supply drops, then extract', null),
  ('Lil'' Flacko',       'Chapter 7 Mini Season', 'legendary', '{Normal,Cursed,Fortune}', 'Chests or supply drops, then extract', null),
  ('Lil'' Uzi Vert Jr.', 'Chapter 7 Mini Season', 'legendary', '{Normal,Cursed,Fortune}', 'Chests or supply drops, then extract', null),
  ('Plundarrgh',         'Chapter 7 Mini Season', 'mythic',    '{Normal,Cursed,Fortune}', 'Chests or supply drops, then extract', null),
  ('Sweet Dreams',       'Chapter 7 Mini Season', 'mythic',    '{Normal}',                'Chests or supply drops, then extract', null),
  ('Mini Miku',          'Chapter 7 Mini Season', 'mythic',    '{Normal,Cursed,Fortune}', 'Chests or supply drops, then extract', null),
  ('Zee',                'Chapter 7 Mini Season', 'mythic',    '{Normal}',                'Chests or supply drops, then extract', null)
on conflict (season, name) do nothing;


-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.squad_status      enable row level security;
alter table public.shoutbox_messages enable row level security;
alter table public.squad_goals       enable row level security;
alter table public.fortnite_sprites  enable row level security;
alter table public.sprite_collection enable row level security;

-- squad_status: read all, write own (upsert = insert + update)
drop policy if exists "squad_status: read"       on public.squad_status;
drop policy if exists "squad_status: insert own" on public.squad_status;
drop policy if exists "squad_status: update own" on public.squad_status;
create policy "squad_status: read" on public.squad_status
  for select to authenticated using (true);
create policy "squad_status: insert own" on public.squad_status
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "squad_status: update own" on public.squad_status
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- shoutbox_messages: read all, post as yourself, delete own
drop policy if exists "shoutbox: read"       on public.shoutbox_messages;
drop policy if exists "shoutbox: insert own" on public.shoutbox_messages;
drop policy if exists "shoutbox: delete own" on public.shoutbox_messages;
create policy "shoutbox: read" on public.shoutbox_messages
  for select to authenticated using (true);
create policy "shoutbox: insert own" on public.shoutbox_messages
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "shoutbox: delete own" on public.shoutbox_messages
  for delete to authenticated using (user_id = (select auth.uid()));

-- squad_goals: read all, create as yourself, anyone bumps progress, creator deletes
drop policy if exists "squad_goals: read"       on public.squad_goals;
drop policy if exists "squad_goals: insert own" on public.squad_goals;
drop policy if exists "squad_goals: progress"   on public.squad_goals;
drop policy if exists "squad_goals: delete own" on public.squad_goals;
create policy "squad_goals: read" on public.squad_goals
  for select to authenticated using (true);
create policy "squad_goals: insert own" on public.squad_goals
  for insert to authenticated with check (created_by = (select auth.uid()));
create policy "squad_goals: progress" on public.squad_goals
  for update to authenticated using (true) with check (true);
create policy "squad_goals: delete own" on public.squad_goals
  for delete to authenticated using (created_by = (select auth.uid()));

-- fortnite_sprites: read all, anyone adds, creator edits/deletes
drop policy if exists "sprites: read"       on public.fortnite_sprites;
drop policy if exists "sprites: insert own" on public.fortnite_sprites;
drop policy if exists "sprites: update own" on public.fortnite_sprites;
drop policy if exists "sprites: delete own" on public.fortnite_sprites;
create policy "sprites: read" on public.fortnite_sprites
  for select to authenticated using (true);
create policy "sprites: insert own" on public.fortnite_sprites
  for insert to authenticated with check (created_by = (select auth.uid()));
create policy "sprites: update own" on public.fortnite_sprites
  for update to authenticated
  using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));
create policy "sprites: delete own" on public.fortnite_sprites
  for delete to authenticated using (created_by = (select auth.uid()));

-- sprite_collection: read all (to compare progress), tick/untick your own
drop policy if exists "sprite_collection: read"       on public.sprite_collection;
drop policy if exists "sprite_collection: insert own" on public.sprite_collection;
drop policy if exists "sprite_collection: delete own" on public.sprite_collection;
create policy "sprite_collection: read" on public.sprite_collection
  for select to authenticated using (true);
create policy "sprite_collection: insert own" on public.sprite_collection
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "sprite_collection: delete own" on public.sprite_collection
  for delete to authenticated using (user_id = (select auth.uid()));


-- -----------------------------------------------------------------------------
-- Table privileges for signed-in users
-- -----------------------------------------------------------------------------
grant select, insert, update     on public.squad_status      to authenticated;
grant select, insert, delete     on public.shoutbox_messages to authenticated;
grant select, insert, delete     on public.squad_goals       to authenticated;
grant update (progress)          on public.squad_goals       to authenticated;
grant select, insert, update, delete on public.fortnite_sprites to authenticated;
grant select, insert, delete     on public.sprite_collection to authenticated;


-- -----------------------------------------------------------------------------
-- Realtime: live updates for Ready Check and Shoutbox
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and tablename = 'squad_status') then
    alter publication supabase_realtime add table public.squad_status;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and tablename = 'shoutbox_messages') then
    alter publication supabase_realtime add table public.shoutbox_messages;
  end if;
end $$;
