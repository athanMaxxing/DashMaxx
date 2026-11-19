/*
 * Schema (see supabase/003_fortnite_matches.sql):
 *   fn_matches     (id, won bool, dropped_together bool, mode text, fill bool, team_size 1-4, created_by, created_at)
 *   fn_match_stats (id, match_id, player_id, kills)
 */
export const FN_MATCH_SELECT = `
  id, won, dropped_together, mode, fill, team_size, created_at,
  fn_match_stats ( id, player_id, kills, profiles ( id, username ) )
`

// Suggestions only — mode is free text so new modes can be typed in.
export const FN_MODES = ['Build', 'Zero Build', 'Ranked Build', 'Ranked Zero Build', 'Reload', 'Blitz', 'OG']

export const FN_MATCHES_CHANGED_EVENT = 'dashmaxx:fn-matches-changed'

export const totalKills = (m) => m.fn_match_stats.reduce((n, s) => n + (s.kills ?? 0), 0)

/** Matches containing every player id in `ids`. */
export const fnPlayedTogether = (matches, ids) =>
  ids.length === 0
    ? matches
    : matches.filter((m) => {
        const present = new Set(m.fn_match_stats.map((s) => s.player_id))
        return ids.every((id) => present.has(id))
      })

export const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0)

export const TEAM_SIZES = [
  { value: 1, label: 'Solo' },
  { value: 2, label: 'Duos' },
  { value: 3, label: 'Trios' },
  { value: 4, label: 'Squads' },
]

export const teamSizeLabel = (n) => TEAM_SIZES.find((t) => t.value === n)?.label ?? '—'
