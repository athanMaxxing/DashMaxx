-- =============================================================================
-- DashMaxx migration 004: admin role + Quote Wall
-- Paste into Supabase → SQL Editor → Run. Safe to re-run.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Admin flag. Users can't change it themselves: profiles only grants
-- UPDATE (username) to signed-in users, so is_admin is only settable here.
-- -----------------------------------------------------------------------------
alter table public.profiles add column if not exists is_admin boolean not null default false;

update public.profiles set is_admin = true where username = 'AthanSteen';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

grant execute on function public.is_admin() to authenticated;


-- -----------------------------------------------------------------------------
-- Quote Wall
-- said_by = a squad member, or said_by_name for anyone else.
-- -----------------------------------------------------------------------------
create table if not exists public.quotes (
  id           bigint generated always as identity primary key,
  body         text not null check (char_length(body) between 1 and 300),
  said_by      uuid references public.profiles (id) on delete set null,
  said_by_name text check (char_length(said_by_name) <= 40),
  context      text check (char_length(context) <= 120),
  created_by   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  check (said_by is not null or said_by_name is not null)
);

create index if not exists quotes_created_at_idx on public.quotes (created_at desc);

create table if not exists public.quote_likes (
  quote_id   bigint not null references public.quotes (id) on delete cascade,
  user_id    uuid   not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (quote_id, user_id)
);

alter table public.quotes      enable row level security;
alter table public.quote_likes enable row level security;

drop policy if exists "quotes: read"       on public.quotes;
drop policy if exists "quotes: insert own" on public.quotes;
drop policy if exists "quotes: delete own" on public.quotes;
create policy "quotes: read" on public.quotes
  for select to authenticated using (true);
create policy "quotes: insert own" on public.quotes
  for insert to authenticated with check (created_by = (select auth.uid()));
create policy "quotes: delete own" on public.quotes
  for delete to authenticated using (created_by = (select auth.uid()));

drop policy if exists "quote_likes: read"       on public.quote_likes;
drop policy if exists "quote_likes: insert own" on public.quote_likes;
drop policy if exists "quote_likes: delete own" on public.quote_likes;
create policy "quote_likes: read" on public.quote_likes
  for select to authenticated using (true);
create policy "quote_likes: insert own" on public.quote_likes
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "quote_likes: delete own" on public.quote_likes
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, delete on public.quotes      to authenticated;
grant select, insert, delete on public.quote_likes to authenticated;


-- -----------------------------------------------------------------------------
-- Admins can delete anything (for clearing test / dummy data).
-- Child rows (match stats, sprite ticks, likes) go with their parent via
-- ON DELETE CASCADE.
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'ow_matches', 'fn_matches', 'squad_bounties', 'squad_goals', 'shoutbox_messages',
    'quotes', 'squad_schedule', 'squad_status', 'fortnite_sprites', 'sprite_collection'
  ] loop
    execute format('drop policy if exists "admin: delete" on public.%I', t);
    execute format(
      'create policy "admin: delete" on public.%I for delete to authenticated using ((select public.is_admin()))',
      t
    );
    execute format('grant delete on public.%I to authenticated', t);
  end loop;
end $$;

-- Check who is admin:
-- select username, is_admin from public.profiles order by is_admin desc, username;
