-- =============================================================================
-- DashMaxx migration 011: Gold sprites + Sir Oscar the Second (22 Nov 2026)
--
-- Oscar's Captain's Day unlocked 14 "Liquid Gold" variants (3x elim XP) and
-- Oscar's boss-drop sprite. Sweet Dreams, Transponder Snail and Zee stay
-- Normal-only. Paste into Supabase → SQL Editor → Run. Safe to re-run.
-- =============================================================================

-- Gold variant on the 13 existing sprites that got one.
update public.fortnite_sprites
set variants = array_append(variants, 'Gold')
where season = 'Chapter 7 Mini Season'
  and name in (
    'Halfpeel''d', 'Re-Pete', 'Barry O''Fish', 'Wayfinder',
    'Chester', 'Kelper', 'Exmarks', 'Lil'' Squibbly', 'Squiplash',
    'Lil'' Flacko', 'Lil'' Uzi Vert Jr.', 'Plundarrgh', 'Mini Miku'
  )
  and not ('Gold' = any (variants));

-- Oscar's boss-drop sprite (all four variants).
insert into public.fortnite_sprites (name, season, rarity, variants, how_to_get, created_by) values
  ('Sir Oscar the Second', 'Chapter 7 Mini Season', 'legendary', '{Normal,Cursed,Fortune,Gold}',
   'Boss drop: defeat Oscar on his ship, The Tiger''s Eye (not guaranteed)', null)
on conflict (season, name) do update set variants = excluded.variants, how_to_get = excluded.how_to_get;

-- Zee is the hidden "secret" sprite (Zero Point, unlocked 12 Nov).
update public.fortnite_sprites
set how_to_get = 'Hidden secret sprite (Zero Point): rare spawn from chests or supply drops, then extract'
where season = 'Chapter 7 Mini Season' and name = 'Zee';
