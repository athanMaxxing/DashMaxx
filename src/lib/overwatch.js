/*
 * Schema (see supabase/schema.sql + 002_more_gadgets.sql):
 *   ow_matches     (id, map, result 'win'|'loss', season, mode, queue, created_by, created_at)
 *   ow_match_stats (id, match_id, player_id, hero, eliminations, deaths, damage, healing, mitigation)
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
  id, map, result, season, mode, queue, created_by, created_at,
  ow_match_stats (
    id, player_id, hero, ${STAT_FIELDS.map((f) => f.key).join(', ')},
    profiles ( id, username )
  )
`

export const MODES = [
  { value: 'control', label: 'Control' },
  { value: 'escort', label: 'Escort' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'push', label: 'Push' },
  { value: 'flashpoint', label: 'Flashpoint' },
  { value: 'clash', label: 'Clash' },
]

export const QUEUES = [
  { value: 'competitive', label: 'Competitive' },
  { value: 'quickplay', label: 'Quick Play' },
]

export const modeLabel = (mode) => MODES.find((m) => m.value === mode)?.label ?? '—'
export const queueLabel = (queue) => QUEUES.find((q) => q.value === queue)?.label ?? '—'

// Every map belongs to exactly one mode, so picking a map fills in the mode.
export const MAP_MODES = {
  'Antarctic Peninsula': 'control', Busan: 'control', Ilios: 'control', 'Lijiang Tower': 'control',
  Nepal: 'control', Oasis: 'control', Samoa: 'control',
  'Circuit Royal': 'escort', Dorado: 'escort', Havana: 'escort', Junkertown: 'escort',
  Rialto: 'escort', 'Route 66': 'escort', 'Shambali Monastery': 'escort',
  'Watchpoint: Gibraltar': 'escort',
  'Blizzard World': 'hybrid', Eichenwalde: 'hybrid', Hollywood: 'hybrid', "King's Row": 'hybrid',
  Midtown: 'hybrid', Numbani: 'hybrid', 'Paraíso': 'hybrid',
  Colosseo: 'push', 'Esperança': 'push', 'New Queen Street': 'push', Runasapi: 'push',
  'New Junk City': 'flashpoint', Suravasa: 'flashpoint', Aatlis: 'flashpoint',
  Hanaoka: 'clash', 'Throne of Anubis': 'clash',
}

export const OW_MAPS = Object.keys(MAP_MODES).sort((a, b) => a.localeCompare(b))

export const modeForMap = (map) => {
  const key = Object.keys(MAP_MODES).find((m) => m.toLowerCase() === String(map).trim().toLowerCase())
  return key ? MAP_MODES[key] : ''
}

export const DEFAULT_SEASON = 'Season 5'

export const isWin = (result) => String(result).toLowerCase() === 'win'

/** Matches containing every player id in `ids`. */
export const playedTogether = (matches, ids) =>
  ids.length === 0
    ? matches
    : matches.filter((m) => {
        const present = new Set(m.ow_match_stats.map((s) => s.player_id))
        return ids.every((id) => present.has(id))
      })

/** Rough single-game impact score used for MVPs and "on fire" — shown in tooltips. */
export const impactScore = (s) =>
  (s.eliminations ?? 0) -
  (s.deaths ?? 0) +
  ((s.damage ?? 0) + (s.healing ?? 0) + (s.mitigation ?? 0) / 2) / 1000

export const IMPACT_HELP = 'Impact = elims − deaths + (damage + healing + mitigation ÷ 2) ÷ 1000'

// Fired after a match is saved so other gadgets can refetch.
export const MATCHES_CHANGED_EVENT = 'dashmaxx:ow-matches-changed'
