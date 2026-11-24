-- =============================================================================
-- DashMaxx migration 012: shoutbox push notifications + clearing your status
-- Paste into Supabase → SQL Editor → Run. Safe to re-run.
-- =============================================================================

-- "Clear status": the row stays (so the "on now" ping cooldown survives) but
-- status/game go null, which the app shows as "No status".
alter table public.squad_status alter column status drop not null;

-- Per-device switch: also ping this device for new shoutbox messages.
alter table public.push_subscriptions add column if not exists notify_shoutbox boolean not null default true;

drop policy if exists "push: update own" on public.push_subscriptions;
create policy "push: update own" on public.push_subscriptions
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant update (notify_shoutbox) on public.push_subscriptions to authenticated;
