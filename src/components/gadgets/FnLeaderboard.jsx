import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Medal, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useSquadData } from '../../context/SquadDataContext'
import { useFortniteData } from '../../context/FortniteDataContext'
import { fnPlayedTogether, pct } from '../../lib/fortnite'
import { PlayerName } from '../Avatar'
import GadgetCard, { GadgetMessage, GadgetSkeleton } from '../GadgetCard'
import PlayerPicker from '../PlayerPicker'

const COLUMNS = [
  { key: 'games', label: 'Games', fmt: (v) => v },
  { key: 'wins', label: 'Wins', fmt: (v) => v },
  { key: 'winRate', label: 'Win %', fmt: (v) => `${Math.round(v * 100)}%` },
  { key: 'kpg', label: 'Kills/g', fmt: (v) => v.toFixed(1) },
  { key: 'kills', label: 'Kills', fmt: (v) => v },
  { key: 'best', label: 'Best', fmt: (v) => v },
]

/** Win rate split by a boolean field, e.g. dropped together vs split. */
function splitRate(matches, field) {
  const yes = matches.filter((m) => m[field])
  const no = matches.filter((m) => !m[field])
  return {
    yes: { games: yes.length, rate: pct(yes.filter((m) => m.won).length, yes.length) },
    no: { games: no.length, rate: pct(no.filter((m) => m.won).length, no.length) },
  }
}

function Insight({ title, yesLabel, noLabel, data }) {
  return (
    <div className="rounded-lg bg-gray-950/50 p-2 text-xs">
      <p className="mb-1 text-gray-400">{title}</p>
      <p>
        <span className="text-gray-300">{yesLabel}</span>{' '}
        <span className="font-semibold text-amber-300">{data.yes.rate}%</span>{' '}
        <span className="text-gray-600">({data.yes.games})</span>
        <span className="mx-1.5 text-gray-600">vs</span>
        <span className="text-gray-300">{noLabel}</span>{' '}
        <span className="font-semibold text-amber-300">{data.no.rate}%</span>{' '}
        <span className="text-gray-600">({data.no.games})</span>
      </p>
    </div>
  )
}

export default function FnLeaderboard() {
  const { user } = useAuth()
  const myId = user.id
  const { profiles, profileById } = useSquadData()
  const { filteredMatches, loading, error } = useFortniteData()
  const [together, setTogether] = useState([])
  const [sort, setSort] = useState({ key: 'wins', dir: 'desc' })

  const scoped = useMemo(() => fnPlayedTogether(filteredMatches, together), [filteredMatches, together])

  const rows = useMemo(() => {
    const only = together.length ? new Set(together) : null
    const by = new Map()
    for (const m of scoped) {
      for (const s of m.fn_match_stats) {
        if (only && !only.has(s.player_id)) continue
        const p = by.get(s.player_id) ?? { id: s.player_id, username: s.profiles?.username ?? '?', games: 0, wins: 0, kills: 0, best: 0 }
        p.games += 1
        if (m.won) p.wins += 1
        p.kills += s.kills
        p.best = Math.max(p.best, s.kills)
        by.set(s.player_id, p)
      }
    }
    return [...by.values()].map((p) => ({ ...p, winRate: p.wins / p.games, kpg: p.kills / p.games }))
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

  const drop = splitRate(scoped, 'dropped_together')
  const fill = splitRate(scoped, 'fill')

  const toggleSort = (key) =>
    setSort((cur) => (cur.key === key ? { key, dir: cur.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: key === 'username' ? 'asc' : 'desc' }))
  const SortIcon = sort.dir === 'asc' ? ArrowUp : ArrowDown
  const th = (key, label, left) => (
    <th key={key} className={`whitespace-nowrap px-2 py-1.5 font-medium ${left ? 'text-left' : 'text-right'}`}>
      <button onClick={() => toggleSort(key)} className={`inline-flex items-center gap-0.5 hover:text-gray-200 ${sort.key === key ? 'text-indigo-300' : ''}`}>
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
          <Insight title="Win % by drop" yesLabel="Together" noLabel="Split" data={drop} />
          <Insight title="Win % by fill" yesLabel="Fill" noLabel="No fill" data={fill} />
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
                <tr key={r.id} className={`border-t border-gray-800/60 ${r.id === myId ? 'bg-indigo-500/5' : ''}`}>
                  <td className="px-1 py-1.5 text-gray-500">{i + 1}</td>
                  <td className={`max-w-[8rem] truncate px-2 py-1.5 font-medium ${r.id === myId ? 'text-indigo-300' : 'text-gray-200'}`}>
                    <PlayerName profile={profileById[r.id] ?? { username: r.username }} />
                  </td>
                  {COLUMNS.map((c) => (
                    <td
                      key={c.key}
                      className={`whitespace-nowrap px-2 py-1.5 text-right tabular-nums ${
                        best[c.key] != null && r[c.key] === best[c.key] && r[c.key] > 0 ? 'font-bold text-amber-300' : 'text-gray-300'
                      }`}
                    >
                      {c.fmt(r[c.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-gray-600">Best = most kills in one game. Gold = squad best.</p>
        </div>
      )}
    </GadgetCard>
  )
}
