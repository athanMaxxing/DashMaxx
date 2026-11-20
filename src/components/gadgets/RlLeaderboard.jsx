import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Medal, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useSquadData } from '../../context/SquadDataContext'
import { useRocketLeagueData } from '../../context/RocketLeagueDataContext'
import { pct } from '../../lib/fortnite'
import { rlPlayedTogether } from '../../lib/rocketleague'
import { PlayerName } from '../Avatar'
import GadgetCard, { GadgetMessage, GadgetSkeleton } from '../GadgetCard'
import PlayerPicker from '../PlayerPicker'

const COLUMNS = [
  { key: 'games', label: 'Games', fmt: (v) => v },
  { key: 'wins', label: 'Wins', fmt: (v) => v },
  { key: 'winRate', label: 'Win %', fmt: (v) => `${Math.round(v * 100)}%` },
  { key: 'gpg', label: 'Goals/g', fmt: (v) => v.toFixed(1) },
  { key: 'apg', label: 'Assists/g', fmt: (v) => v.toFixed(1) },
  { key: 'spg', label: 'Saves/g', fmt: (v) => v.toFixed(1) },
  { key: 'ppg', label: 'Pts/g', fmt: (v) => Math.round(v) },
  { key: 'mvps', label: 'MVPs', fmt: (v) => v },
]

function Split({ title, a, b }) {
  return (
    <div className="rounded-lg bg-gray-950/50 p-2 text-xs">
      <p className="mb-1 text-gray-400">{title}</p>
      <p>
        {[a, b].map((s, i) => (
          <span key={s.label}>
            {i > 0 && <span className="mx-1.5 text-gray-600">vs</span>}
            <span className="text-gray-300">{s.label}</span> <span className="font-semibold text-sky-300">{s.rate}%</span>{' '}
            <span className="text-gray-600">({s.games})</span>
          </span>
        ))}
      </p>
    </div>
  )
}

const splitBy = (matches, test, yes, no) => {
  const y = matches.filter(test)
  const n = matches.filter((m) => !test(m))
  return [
    { label: yes, games: y.length, rate: pct(y.filter((m) => m.won).length, y.length) },
    { label: no, games: n.length, rate: pct(n.filter((m) => m.won).length, n.length) },
  ]
}

export default function RlLeaderboard() {
  const { user } = useAuth()
  const { profiles, profileById } = useSquadData()
  const { filteredMatches, loading, error } = useRocketLeagueData()
  const [together, setTogether] = useState([])
  const [sort, setSort] = useState({ key: 'wins', dir: 'desc' })

  const scoped = useMemo(() => rlPlayedTogether(filteredMatches, together), [filteredMatches, together])

  const rows = useMemo(() => {
    const only = together.length ? new Set(together) : null
    const by = new Map()
    for (const m of scoped) {
      for (const s of m.rl_match_stats) {
        if (only && !only.has(s.player_id)) continue
        const p = by.get(s.player_id) ?? { id: s.player_id, username: s.profiles?.username ?? '?', games: 0, wins: 0, goals: 0, assists: 0, saves: 0, score: 0, mvps: 0 }
        p.games += 1
        if (m.won) p.wins += 1
        p.goals += s.goals
        p.assists += s.assists
        p.saves += s.saves
        p.score += s.score
        if (s.mvp) p.mvps += 1
        by.set(s.player_id, p)
      }
    }
    return [...by.values()].map((p) => ({
      ...p,
      winRate: p.wins / p.games,
      gpg: p.goals / p.games,
      apg: p.assists / p.games,
      spg: p.saves / p.games,
      ppg: p.score / p.games,
    }))
  }, [scoped, together])

  const sorted = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) =>
      sort.key === 'username' ? a.username.localeCompare(b.username) * dir : (a[sort.key] - b[sort.key]) * dir || b.games - a.games,
    )
  }, [rows, sort])

  const best = useMemo(() => {
    if (rows.length < 2) return {}
    return Object.fromEntries(COLUMNS.filter((c) => c.key !== 'games').map((c) => [c.key, Math.max(...rows.map((r) => r[c.key]))]))
  }, [rows])

  const toggleSort = (key) =>
    setSort((cur) => (cur.key === key ? { key, dir: cur.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: key === 'username' ? 'asc' : 'desc' }))
  const SortIcon = sort.dir === 'asc' ? ArrowUp : ArrowDown
  const th = (key, label, left) => (
    <th key={key} className={`whitespace-nowrap px-2 py-1.5 font-medium ${left ? 'text-left' : 'text-right'}`}>
      <button onClick={() => toggleSort(key)} className={`inline-flex items-center gap-0.5 hover:text-gray-200 ${sort.key === key ? 'text-sky-300' : ''}`}>
        {label}
        {sort.key === key && <SortIcon className="h-3 w-3" />}
      </button>
    </th>
  )

  return (
    <GadgetCard title="Leaderboard" icon={Medal}>
      <PlayerPicker
        profiles={profiles}
        selected={together}
        onChange={setTogether}
        label="Played together"
        icon={Users}
        hint={`${scoped.length} game${scoped.length === 1 ? '' : 's'}${together.length ? ` with all ${together.length} selected together` : ''}`}
      />

      {scoped.length > 0 && (
        <div className="mb-3 grid gap-2 sm:grid-cols-2">
          <Split title="Win % by queue" a={splitBy(scoped, (m) => m.ranked, 'Ranked', 'Casual')[0]} b={splitBy(scoped, (m) => m.ranked, 'Ranked', 'Casual')[1]} />
          <Split title="Win % by fill" a={splitBy(scoped, (m) => m.fill, 'Fill', 'No fill')[0]} b={splitBy(scoped, (m) => m.fill, 'Fill', 'No fill')[1]} />
        </div>
      )}

      {error ? (
        <GadgetMessage tone="error">{error}</GadgetMessage>
      ) : loading && rows.length === 0 ? (
        <GadgetSkeleton />
      ) : sorted.length === 0 ? (
        <GadgetMessage>No games yet.</GadgetMessage>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-gray-500">
              <tr>
                <th className="w-6 px-1 py-1.5 text-left font-medium">#</th>
                {th('username', 'Player', true)}
                {COLUMNS.map((c) => th(c.key, c.label))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={r.id} className={`border-t border-gray-800/60 ${r.id === user.id ? 'bg-indigo-500/5' : ''}`}>
                  <td className="px-1 py-1.5 text-gray-500">{i + 1}</td>
                  <td className={`max-w-[8rem] truncate px-2 py-1.5 font-medium ${r.id === user.id ? 'text-indigo-300' : 'text-gray-200'}`}>
                    <PlayerName profile={profileById[r.id] ?? { username: r.username }} />
                  </td>
                  {COLUMNS.map((c) => (
                    <td
                      key={c.key}
                      className={`whitespace-nowrap px-2 py-1.5 text-right tabular-nums ${
                        best[c.key] != null && r[c.key] === best[c.key] && r[c.key] > 0 ? 'font-bold text-sky-300' : 'text-gray-300'
                      }`}
                    >
                      {c.fmt(r[c.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-gray-600">Highlighted = squad best.</p>
        </div>
      )}
    </GadgetCard>
  )
}
