/*
 * Assumed schema (edit here if your columns differ):
 *   ow_matches     (id, map text, result text 'win' | 'loss', created_at)
 *   ow_match_stats (id, match_id -> ow_matches.id, player_id -> profiles.id,
 *                   hero text, eliminations int, deaths int, damage int, healing int,
 *                   mitigation int)
 */
export const STAT_FIELDS = [
  { key: 'eliminations', label: 'Elims' },
  { key: 'deaths', label: 'Deaths' },
  { key: 'damage', label: 'Dmg' },
  { key: 'healing', label: 'Heal' },
  { key: 'mitigation', label: 'Mit' },
]

// Free text is still allowed, so a hero missing from this list can be typed in.
export const OW_HEROES = [
  // Tank
  'D.Va', 'Doomfist', 'Hazard', 'Junker Queen', 'Mauga', 'Orisa', 'Ramattra', 'Reinhardt',
  'Roadhog', 'Sigma', 'Winston', 'Wrecking Ball', 'Zarya',
  // Damage
  'Ashe', 'Bastion', 'Cassidy', 'Echo', 'Freja', 'Genji', 'Hanzo', 'Junkrat', 'Mei', 'Pharah',
  'Reaper', 'Sojourn', 'Soldier: 76', 'Sombra', 'Symmetra', 'Torbjörn', 'Tracer', 'Venture',
  'Widowmaker',
  // Support
  'Ana', 'Baptiste', 'Brigitte', 'Illari', 'Juno', 'Kiriko', 'Lifeweaver', 'Lúcio', 'Mercy',
  'Moira', 'Wuyang', 'Zenyatta',
]

export const MATCH_SELECT = `
  id, map, result, created_at,
  ow_match_stats (
    id, player_id, hero, ${STAT_FIELDS.map((f) => f.key).join(', ')},
    profiles ( id, username )
  )
`

export const OW_MAPS = [
  'Antarctic Peninsula', 'Blizzard World', 'Busan', 'Circuit Royal', 'Colosseo', 'Dorado',
  'Eichenwalde', 'Esperança', 'Havana', 'Hollywood', 'Ilios', 'Junkertown', 'King\'s Row',
  'Lijiang Tower', 'Midtown', 'Nepal', 'New Junk City', 'New Queen Street', 'Numbani', 'Oasis',
  'Paraíso', 'Rialto', 'Route 66', 'Runasapi', 'Samoa', 'Shambali Monastery', 'Suravasa',
  'Watchpoint: Gibraltar',
]

export const isWin = (result) => String(result).toLowerCase() === 'win'

// Fired after a match is saved so other gadgets can refetch.
export const MATCHES_CHANGED_EVENT = 'dashmaxx:ow-matches-changed'
