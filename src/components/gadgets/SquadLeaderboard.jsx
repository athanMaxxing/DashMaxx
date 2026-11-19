import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Trophy, RefreshCw, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useSquadData } from '../../context/SquadDataContext'
import { isWin, playedTogether, STAT_FIELDS } from '../../lib/overwatch'
import { PlayerName } from '../Avatar'
import GadgetCard, { GadgetMessage, GadgetSkeleton } from '../GadgetCard'
import PlayerPicker from '../PlayerPicker'

// Columns where a lower number is better.
const LOWER_IS_BETTER = new Set(['deaths'])

const COLUMNS = [
  { key: 'games', label: 'Games', format: (v) => v },
  { key: 'winRate', label: 'Win %', format: (v) => `${Math.round(v * 100)}%` },
  { key: 'kd', label: 'K/D', format: (v) => (v == null ? '—' : v.toFixed(2)) },
  ...STAT_FIELDS.map((f) => ({
    key: f.key,
    label: f.label,
    format: (v) =>
      v == null ? '—' : v >= 1000 ? Math.round(v).toLocaleString() : v.toFixed(1),
  })),
]

/** Aggregate per-player averages from a list of matches, limited to `playerIds` when given. */
function buildLeaderboard(matches, playerIds) {
  const byPlayer = new Map()

  for (const match of matches) {
    const won = isWin(match.result)
    for (const s of match.ow_match_stats) {
      if (playerIds && !playerIds.has(s.player_id)) continue
      let p = byPlayer.get(s.player_id)
      if (!p) {
        p = {
          id: s.player_id,
          username: s.profiles?.username ?? 'Unknown',
          games: 0,
          wins: 0,
          sums: {},
          counts: {},
          heroes: new Map(),
        }
        byPlayer.set(s.player_id, p)
      }
      p.games += 1
      if (won) p.wins += 1
      for (const f of STAT_FIELDS) {
        if (s[f.key] == null) continue
        p.sums[f.key] = (p.sums[f.key] ?? 0) + s[f.key]
        p.counts[f.key] = (p.counts[f.key] ?? 0) + 1
      }
      const hero = s.hero?.trim()
      if (hero) {
        const key = hero.toLowerCase()
        const entry = p.heroes.get(key) ?? { name: hero, count: 0 }
        entry.count += 1
        p.heroes.set(key, entry)
      }
    }
  }

  return [...byPlayer.values()].map((p) => {
    const row = { id: p.id, username: p.username, games: p.games, winRate: p.wins / p.games }
    for (const f of STAT_FIELDS) row[f.key] = p.counts[f.key] ? p.sums[f.key] / p.counts[f.key] : null
    const elims = p.sums.eliminations
    const deaths = p.sums.deaths
    row.kd = elims == null ? null : deaths ? elims / deaths : elims
    const top = [...p.heroes.values()].sort((a, b) => b.count - a.count)[0]
    row.topHero = top ? `${top.name} (${top.count})` : '—'
    return row
  })
}

export default function SquadLeaderboard() {
  const { user } = useAuth()
  const { profiles, profileById, filteredMatches: matches, loading, error, reload: load } = useSquadData()
  const [together, setTogether] = useState([]) // profile ids that must ALL be in the match
  const [sort, setSort] = useState({ key: 'winRate', dir: 'desc' })

  // With a squad selected: only matches where ALL of them played, and only their rows.
  const { rows, matchCount } = useMemo(() => {
    const scoped = playedTogether(matches, together)
    const ids = together.length ? new Set(together) : null
    return { rows: buildLeaderboard(scoped, ids), matchCount: scoped.length }
  }, [matches, together])

  const sorted = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const av = a[sort.key]
      const bv = b[sort.key]
      if (av == null && bv == null) return b.games - a.games
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'string') return av.localeCompare(bv) * dir
      return (av - bv) * dir || b.games - a.games
    })
  }, [rows, sort])

  // Best value per numeric column, for highlighting.
  const best = useMemo(() => {
    const out = {}
    if (rows.length < 2) return out
    for (const c of COLUMNS) {
      const vals = rows.map((r) => r[c.key]).filter((v) => v != null)
      if (vals.length) out[c.key] = LOWER_IS_BETTER.has(c.key) ? Math.min(...vals) : Math.max(...vals)
    }
    return out
  }, [rows])

  const toggleSort = (key) =>
    setSort((cur) =>
      cur.key === key
        ? { key, dir: cur.dir === 'desc' ? 'asc' : 'desc' }
        : { key, dir: key === 'username' || LOWER_IS_BETTER.has(key) ? 'asc' : 'desc' },
    )


  const SortIcon = sort.dir === 'asc' ? ArrowUp : ArrowDown
  const header = (key, label, align = 'right') => (
    <th key={key} className={`whitespace-nowrap px-2 py-1.5 font-medium ${align === 'left' ? 'text-left' : 'text-right'}`}>
      <button
        onClick={() => toggleSort(key)}
        className={`inline-flex items-center gap-0.5 hover:text-gray-200 ${
          sort.key === key ? 'text-indigo-300' : ''
        }`}
      >
        {label}
        {sort.key === key && <SortIcon className="h-3 w-3" />}
      </button>
    </th>
  )

  return (
    <GadgetCard
      title="Squad Leaderboard"
      icon={Trophy}
      actions={
        <button className="btn-ghost p-1.5" onClick={load} title="Refresh" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      }
    >
      <PlayerPicker
        profiles={profiles}
        selected={together}
        onChange={setTogether}
        label="Played together"
        icon={Users}
        hint={
          together.length
            ? `${matchCount} match${matchCount === 1 ? '' : 'es'} with all ${together.length} selected together · stats from those games only`
            : `${matchCount} match${matchCount === 1 ? '' : 'es'} · tick players to see how they do together`
        }
      />

      {error ? (
        <GadgetMessage tone="error">{error}</GadgetMessage>
      ) : loading && matches.length === 0 ? (
        <GadgetSkeleton />
      ) : sorted.length === 0 ? (
        <GadgetMessage>
          {together.length ? 'That squad hasn’t played a logged match together yet.' : 'No matches logged yet.'}
        </GadgetMessage>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-gray-500">
              <tr>
                <th className="w-6 px-1 py-1.5 text-left font-medium">#</th>
                {header('username', 'Player', 'left')}
                {COLUMNS.map((c) => header(c.key, c.label))}
                {header('topHero', 'Top hero', 'left')}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr
                  key={r.id}
                  className={`border-t border-gray-800/60 ${r.id === user.id ? 'bg-indigo-500/5' : ''}`}
                >
                  <td className="px-1 py-1.5 text-gray-500">{i + 1}</td>
                  <td
                    className={`max-w-[8rem] truncate px-2 py-1.5 font-medium ${
                      r.id === user.id ? 'text-indigo-300' : 'text-gray-200'
                    }`}
                  >
                    <PlayerName profile={profileById[r.id] ?? { username: r.username }} />
                  </td>
                  {COLUMNS.map((c) => {
                    const isBest = c.key !== 'games' && best[c.key] != null && r[c.key] === best[c.key]
                    const winColor =
                      c.key === 'winRate' ? (r.winRate >= 0.5 ? 'text-green-400' : 'text-red-400') : ''
                    return (
                      <td
                        key={c.key}
                        className={`whitespace-nowrap px-2 py-1.5 text-right tabular-nums ${
                          isBest ? 'font-bold text-amber-300' : winColor || 'text-gray-300'
                        }`}
                      >
                        {c.format(r[c.key])}
                      </td>
                    )
                  })}
                  <td className="whitespace-nowrap px-2 py-1.5 text-gray-300">{r.topHero}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-gray-600">
            Stat columns are per-game averages. Gold = squad best. Click a header to sort.
          </p>
        </div>
      )}
    </GadgetCard>
  )
}
