-- =============================================================================
-- DashMaxx migration 007: push notifications ("X is on now")
-- Paste into Supabase → SQL Editor → Run. Safe to re-run.
-- =============================================================================

-- One row per device that switched notifications on.
create table if not exists public.push_subscriptions (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Users only ever see / manage their own devices. The sending function uses the
-- service role key, which bypasses RLS to read everyone's subscriptions.
drop policy if exists "push: read own"   on public.push_subscriptions;
drop policy if exists "push: insert own" on public.push_subscriptions;
drop policy if exists "push: delete own" on public.push_subscriptions;
create policy "push: read own" on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "push: insert own" on public.push_subscriptions
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "push: delete own" on public.push_subscriptions
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, delete on public.push_subscriptions to authenticated;

-- Cooldown: when we last pinged the squad about this person going on.
alter table public.squad_status add column if not exists online_notified_at timestamptz;
