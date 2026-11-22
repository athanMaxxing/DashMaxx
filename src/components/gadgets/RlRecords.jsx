import { useMemo } from 'react'
import { Award, TrendingDown, TrendingUp } from 'lucide-react'
import { useRocketLeagueData } from '../../context/RocketLeagueDataContext'
import { playlistLabel } from '../../lib/rocketleague'
import GadgetCard, { GadgetMessage, GadgetSkeleton } from '../GadgetCard'

const SINGLE = [
  ['goals', 'Most goals in a game'],
  ['assists', 'Most assists in a game'],
  ['saves', 'Most saves in a game'],
]

/** Streaks and best single games for Rocket League. */
export default function RlRecords() {
  const { filteredMatches, loading, error } = useRocketLeagueData()

  const data = useMemo(() => {
    if (filteredMatches.length === 0) return null
    const chrono = [...filteredMatches].reverse()

    let bestWin = 0
    let run = 0
    let prev = null
    for (const m of chrono) {
      run = m.won === prev ? run + 1 : 1
      prev = m.won
      if (m.won) bestWin = Math.max(bestWin, run)
    }

    const top = {}
    let bigWin = null
    for (const m of filteredMatches) {
      for (const s of m.rl_match_stats) {
        for (const [key] of SINGLE) {
          if (!top[key] || s[key] > top[key].value) top[key] = { value: s[key], who: s.profiles?.username ?? '?', match: m }
        }
      }
      const margin = m.our_goals - m.their_goals
      if (m.won && (!bigWin || margin > bigWin.margin)) bigWin = { margin, match: m }
    }

    // Biggest single-game MMR jump per player/playlist.
    let bigJump = null
    const last = new Map()
    for (const m of chrono) {
      if (!m.ranked) continue
      for (const s of m.rl_match_stats) {
        if (s.mmr == null) continue
        const k = `${s.player_id}|${m.team_size}`
        if (last.has(k)) {
          const jump = s.mmr - last.get(k)
          if (!bigJump || jump > bigJump.jump) bigJump = { jump, who: s.profiles?.username ?? '?', match: m }
        }
        last.set(k, s.mmr)
      }
    }

    return { current: run, currentWin: prev, bestWin, top, bigWin, bigJump }
  }, [filteredMatches])

  const detail = (m) => `${m.ranked ? 'Ranked' : 'Casual'} ${playlistLabel(m.team_size)} · ${new Date(m.created_at).toLocaleDateString()}`

  const records = data
    ? [
        ...SINGLE.map(([key, label]) => data.top[key]?.value > 0 && { label, who: data.top[key].who, detail: detail(data.top[key].match), value: data.top[key].value }),
        data.bigWin && {
          label: 'Biggest win',
          who: `${data.bigWin.match.our_goals}–${data.bigWin.match.their_goals}`,
          detail: detail(data.bigWin.match),
          value: `+${data.bigWin.margin}`,
        },
        data.bigJump?.jump > 0 && { label: 'Biggest MMR gain in one game', who: data.bigJump.who, detail: detail(data.bigJump.match), value: `+${data.bigJump.jump}` },
      ].filter(Boolean)
    : []

  return (
    <GadgetCard title="Records" icon={Award}>
      {error ? (
        <GadgetMessage tone="error">{error}</GadgetMessage>
      ) : loading && !data ? (
        <GadgetSkeleton />
      ) : !data ? (
        <GadgetMessage>No games yet.</GadgetMessage>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 text-center">
            <div className={`rounded-lg p-2 ${data.currentWin ? 'bg-emerald-500/10' : 'bg-gray-950/50'}`}>
              <p className="flex items-center justify-center gap-1 text-xl font-bold tabular-nums">
                {data.currentWin ? <TrendingUp className="h-4 w-4 text-emerald-400" /> : <TrendingDown className="h-4 w-4 text-gray-500" />}
                {data.current}
                {data.currentWin ? 'W' : 'L'}
              </p>
              <p className="text-[11px] text-gray-400">Current streak</p>
            </div>
            <div className="rounded-lg bg-gray-950/50 p-2">
              <p className="text-xl font-bold tabular-nums text-sky-300">{data.bestWin}</p>
              <p className="text-[11px] text-gray-400">Best win streak</p>
            </div>
          </div>
          <ul className="space-y-1.5">
            {records.map((r) => (
              <li key={r.label} className="flex items-center gap-3 rounded-md border border-gray-800 bg-gray-950/50 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-400">{r.label}</p>
                  <p className="truncate text-sm font-medium text-gray-200">
                    {r.who}
                    <span className="ml-1.5 text-xs font-normal text-gray-500">{r.detail}</span>
                  </p>
                </div>
                <span className="text-lg font-bold tabular-nums text-sky-300">{r.value}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </GadgetCard>
  )
}
