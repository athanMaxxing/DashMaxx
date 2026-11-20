/*
 * Schema (see supabase/010_rocket_league.sql):
 *   rl_matches     (id, won, ranked, team_size 1-4, fill, our_goals, their_goals, created_by, created_at)
 *   rl_match_stats (id, match_id, player_id, goals, assists, saves, score, mvp, mmr)
 */
export const RL_MATCH_SELECT = `
  id, won, ranked, team_size, fill, our_goals, their_goals, created_by, created_at,
  rl_match_stats ( id, player_id, goals, assists, saves, score, mvp, mmr, profiles ( id, username ) )
`

export const RL_MATCHES_CHANGED_EVENT = 'dashmaxx:rl-matches-changed'

export const PLAYLISTS = [
  { value: 1, label: 'Solo', long: 'Duel 1v1' },
  { value: 2, label: 'Duo', long: 'Doubles 2v2' },
  { value: 3, label: 'Trio', long: 'Standard 3v3' },
  { value: 4, label: 'Chaos', long: 'Chaos 4v4', casualOnly: true },
]
export const RANKED_PLAYLISTS = PLAYLISTS.filter((p) => !p.casualOnly)
export const playlistLabel = (n) => PLAYLISTS.find((p) => p.value === n)?.label ?? '—'
export const playlistLong = (n) => PLAYLISTS.find((p) => p.value === n)?.long ?? '—'

/** Matches containing every player id in `ids`. */
export const rlPlayedTogether = (matches, ids) =>
  ids.length === 0
    ? matches
    : matches.filter((m) => {
        const present = new Set(m.rl_match_stats.map((s) => s.player_id))
        return ids.every((id) => present.has(id))
      })

/*
 * Ranks from MMR. Rocket League shifts cutoffs a little every season, so these
 * are approximate. Tweak the numbers here if they drift.
 * Each entry is the MMR where that rank (Division I) starts.
 */
const TIERS = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Champion', 'Grand Champion']
const CUTOFFS = {
  // Duel
  1: [0, 155, 215, 275, 335, 395, 455, 515, 575, 635, 695, 755, 815, 875, 935, 995, 1055, 1115, 1175, 1235, 1295],
  // Doubles
  2: [0, 175, 235, 295, 355, 415, 475, 535, 595, 655, 715, 775, 835, 915, 995, 1075, 1195, 1315, 1435, 1575, 1715],
  // Standard
  3: [0, 175, 235, 295, 355, 415, 475, 535, 595, 655, 715, 775, 835, 915, 995, 1075, 1195, 1315, 1435, 1575, 1715],
}
const SSL = { 1: 1355, 2: 1860, 3: 1860 }

const ROMAN = ['I', 'II', 'III']
const TIER_SHORT = { Bronze: 'Bronze', Silver: 'Silver', Gold: 'Gold', Platinum: 'Plat', Diamond: 'Diamond', Champion: 'Champ', 'Grand Champion': 'GC' }
export const TIER_STYLE = {
  Bronze: 'text-orange-400 bg-orange-500/10 ring-orange-500/30',
  Silver: 'text-slate-200 bg-slate-400/10 ring-slate-400/30',
  Gold: 'text-yellow-300 bg-yellow-400/10 ring-yellow-400/30',
  Platinum: 'text-cyan-300 bg-cyan-400/10 ring-cyan-400/30',
  Diamond: 'text-blue-300 bg-blue-500/10 ring-blue-400/30',
  Champion: 'text-purple-300 bg-purple-500/10 ring-purple-400/30',
  'Grand Champion': 'text-rose-300 bg-rose-500/10 ring-rose-400/30',
  'Supersonic Legend': 'text-fuchsia-200 bg-fuchsia-400/15 ring-fuchsia-300/40',
}
export const TIER_HEX = {
  Bronze: '#fb923c',
  Silver: '#cbd5e1',
  Gold: '#fde047',
  Platinum: '#67e8f9',
  Diamond: '#93c5fd',
  Champion: '#d8b4fe',
  'Grand Champion': '#fda4af',
  'Supersonic Legend': '#f5d0fe',
}

/**
 * { tier, name, short, division, index, start, next } for an MMR in a ranked playlist.
 * `index` increases with every rank (0 = Bronze I … 21 = SSL) so ranks can be compared.
 */
export function rankFor(mmr, playlist) {
  if (mmr == null || !CUTOFFS[playlist]) return null
  const cuts = CUTOFFS[playlist]
  if (mmr >= SSL[playlist]) {
    return { tier: 'Supersonic Legend', name: 'Supersonic Legend', short: 'SSL', division: null, index: 21, start: SSL[playlist], next: null }
  }
  let i = 0
  while (i + 1 < cuts.length && mmr >= cuts[i + 1]) i += 1
  const tier = TIERS[Math.floor(i / 3)]
  const name = `${tier} ${ROMAN[i % 3]}`
  const start = cuts[i]
  const end = i + 1 < cuts.length ? cuts[i + 1] : SSL[playlist]
  // Four divisions per rank, split evenly.
  const division = Math.min(4, Math.floor(((mmr - start) / (end - start)) * 4) + 1)
  const short = `${TIER_SHORT[tier]} ${ROMAN[i % 3]}`
  return { tier, name, short, division, index: i, start, next: end }
}

/** The MMR where each rank starts, for drawing bands on charts. */
export function rankBands(playlist) {
  if (!CUTOFFS[playlist]) return []
  return [
    ...CUTOFFS[playlist].map((start, i) => ({ start, tier: TIERS[Math.floor(i / 3)], name: `${TIERS[Math.floor(i / 3)]} ${ROMAN[i % 3]}` })),
    { start: SSL[playlist], tier: 'Supersonic Legend', name: 'Supersonic Legend' },
  ]
}

/**
 * Every ranked MMR entry for one player in one playlist, oldest first:
 * [{ mmr, at, matchId, won }]
 */
export function mmrHistory(matches, playerId, playlist) {
  const out = []
  for (const m of matches) {
    if (!m.ranked || m.team_size !== playlist) continue
    const s = m.rl_match_stats.find((x) => x.player_id === playerId)
    if (s?.mmr != null) out.push({ mmr: s.mmr, at: m.created_at, matchId: m.id, won: m.won })
  }
  return out.sort((a, b) => new Date(a.at) - new Date(b.at))
}

/** Last MMR a player logged in a playlist (to prefill the form), or ''. */
export function lastMmr(matches, playerId, playlist) {
  const h = mmrHistory(matches, playerId, playlist)
  return h.length ? h[h.length - 1].mmr : ''
}
