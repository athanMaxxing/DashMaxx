-- =============================================================================
-- DashMaxx migration 009: sprite mastery
--
-- Each ticked sprite variant can now also be marked "mastered" (tap again in
-- the Sprite Checklist: not collected → collected → mastered → not collected).
-- Paste into Supabase → SQL Editor → Run. Safe to re-run.
-- =============================================================================

alter table public.sprite_collection
  add column if not exists mastered boolean not null default false;

-- Players can flip mastered on their own rows (only that column).
drop policy if exists "sprite_collection: update own" on public.sprite_collection;
create policy "sprite_collection: update own" on public.sprite_collection
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant update (mastered) on public.sprite_collection to authenticated;
