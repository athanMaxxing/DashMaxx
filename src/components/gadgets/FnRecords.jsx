import { useMemo } from 'react'
import { Award, TrendingDown, TrendingUp } from 'lucide-react'
import { useFortniteData } from '../../context/FortniteDataContext'
import { totalKills } from '../../lib/fortnite'
import GadgetCard, { GadgetMessage } from '../GadgetCard'

/** Streaks and single-game / single-night records for Fortnite. */
export default function FnRecords() {
  const { filteredMatches, loading, error } = useFortniteData()

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

    let topKills = null
    let topSquad = null
    for (const m of filteredMatches) {
      for (const s of m.fn_match_stats) {
        if (!topKills || s.kills > topKills.kills) topKills = { kills: s.kills, who: s.profiles?.username ?? '?', match: m }
      }
      const k = totalKills(m)
      if (!topSquad || k > topSquad.kills) topSquad = { kills: k, match: m }
    }

    const days = new Map()
    for (const m of filteredMatches) {
      if (!m.won) continue
      const d = new Date(m.created_at).toDateString()
      days.set(d, (days.get(d) ?? 0) + 1)
    }
    const bestNight = [...days.entries()].sort((a, b) => b[1] - a[1])[0]

    return { current: run, currentWin: prev, bestWin, topKills, topSquad, bestNight }
  }, [filteredMatches])

  const date = (m) => new Date(m.created_at).toLocaleDateString()

  const records = data
    ? [
        data.topKills?.kills > 0 && {
          label: 'Most kills in a game',
          who: data.topKills.who,
          detail: `${data.topKills.match.mode} · ${date(data.topKills.match)}`,
          value: data.topKills.kills,
        },
        data.topSquad?.kills > 0 && {
          label: 'Most squad kills in a game',
          who: data.topSquad.match.fn_match_stats.map((s) => s.profiles?.username ?? '?').join(', '),
          detail: `${data.topSquad.match.mode} · ${date(data.topSquad.match)}`,
          value: data.topSquad.kills,
        },
        data.bestNight && {
          label: 'Most wins in one night',
          who: data.bestNight[0],
          detail: '',
          value: data.bestNight[1],
        },
      ].filter(Boolean)
    : []

  return (
    <GadgetCard title="Fortnite Records" icon={Award}>
      {error ? (
        <GadgetMessage tone="error">{error}</GadgetMessage>
      ) : loading && !data ? (
        <GadgetMessage>Loading…</GadgetMessage>
      ) : !data ? (
        <GadgetMessage>No games yet.</GadgetMessage>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 text-center">
            <div className={`rounded-lg p-2 ${data.currentWin ? 'bg-amber-500/10' : 'bg-gray-950/50'}`}>
              <p className="flex items-center justify-center gap-1 text-xl font-bold tabular-nums">
                {data.currentWin ? <TrendingUp className="h-4 w-4 text-amber-300" /> : <TrendingDown className="h-4 w-4 text-gray-500" />}
                {data.current}
                {data.currentWin ? 'W' : 'L'}
              </p>
              <p className="text-[11px] text-gray-400">Current streak</p>
            </div>
            <div className="rounded-lg bg-gray-950/50 p-2">
              <p className="text-xl font-bold tabular-nums text-amber-300">{data.bestWin}</p>
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
                    {r.detail && <span className="ml-1.5 text-xs font-normal text-gray-500">{r.detail}</span>}
                  </p>
                </div>
                <span className="text-lg font-bold tabular-nums text-amber-300">{r.value}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </GadgetCard>
  )
}
