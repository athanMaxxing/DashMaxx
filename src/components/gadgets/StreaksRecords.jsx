import { useMemo } from 'react'
import { Award, TrendingDown, TrendingUp } from 'lucide-react'
import { useSquadData } from '../../context/SquadDataContext'
import { IMPACT_HELP, impactScore, isWin, STAT_FIELDS } from '../../lib/overwatch'
import GadgetCard, { GadgetMessage, GadgetSkeleton } from '../GadgetCard'

const RECORD_FIELDS = [
  ...STAT_FIELDS.filter((f) => f.key !== 'deaths').map((f) => ({
    key: f.key,
    label: `Most ${f.key === 'eliminations' ? 'elims' : f.key}`,
    value: (s) => s[f.key],
  })),
  { key: 'impact', label: 'Best impact game', value: impactScore, help: IMPACT_HELP },
]

/** Current and longest streaks, plus single-game records and who holds them. */
export default function StreaksRecords() {
  const { filteredMatches, loading, error } = useSquadData()

  const data = useMemo(() => {
    if (filteredMatches.length === 0) return null
    const chrono = [...filteredMatches].reverse() // oldest first

    let longestWin = 0
    let longestLoss = 0
    let run = 0
    let prev = null
    for (const m of chrono) {
      const w = isWin(m.result)
      run = w === prev ? run + 1 : 1
      prev = w
      if (w) longestWin = Math.max(longestWin, run)
      else longestLoss = Math.max(longestLoss, run)
    }
    const currentWin = prev
    const current = run

    const records = RECORD_FIELDS.map((f) => {
      let best = null
      for (const m of filteredMatches) {
        for (const s of m.ow_match_stats) {
          const v = f.value(s)
          if (v == null) continue
          if (!best || v > best.value) best = { value: v, stat: s, match: m }
        }
      }
      return { ...f, best }
    }).filter((r) => r.best && r.best.value > 0)

    return { current, currentWin, longestWin, longestLoss, records }
  }, [filteredMatches])

  const fmt = (v) => (v >= 1000 ? Math.round(v).toLocaleString() : Number.isInteger(v) ? v : v.toFixed(1))

  return (
    <GadgetCard title="Streaks & Records" icon={Award}>
      {error ? (
        <GadgetMessage tone="error">{error}</GadgetMessage>
      ) : loading && !data ? (
        <GadgetSkeleton />
      ) : !data ? (
        <GadgetMessage>No matches yet — records start with your first game.</GadgetMessage>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-2 text-center">
            <div className={`rounded-lg p-2 ${data.currentWin ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
              <p className="flex items-center justify-center gap-1 text-xl font-bold tabular-nums">
                {data.currentWin ? (
                  <TrendingUp className="h-4 w-4 text-green-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-400" />
                )}
                {data.current}
                {data.currentWin ? 'W' : 'L'}
              </p>
              <p className="text-[11px] text-gray-400">Current streak</p>
            </div>
            <div className="rounded-lg bg-gray-950/50 p-2">
              <p className="text-xl font-bold tabular-nums text-green-400">{data.longestWin}</p>
              <p className="text-[11px] text-gray-400">Best win streak</p>
            </div>
            <div className="rounded-lg bg-gray-950/50 p-2">
              <p className="text-xl font-bold tabular-nums text-red-400">{data.longestLoss}</p>
              <p className="text-[11px] text-gray-400">Worst loss streak</p>
            </div>
          </div>

          <ul className="space-y-1.5">
            {data.records.map((r) => (
              <li
                key={r.key}
                className="flex items-center gap-3 rounded-md border border-gray-800 bg-gray-950/50 px-3 py-2"
                title={r.help}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-400">{r.label}</p>
                  <p className="truncate text-sm font-medium text-gray-200">
                    {r.best.stat.profiles?.username ?? 'Unknown'}
                    <span className="ml-1.5 text-xs font-normal text-gray-500">
                      {[r.best.stat.hero, r.best.match.map, new Date(r.best.match.created_at).toLocaleDateString()]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </p>
                </div>
                <span className="text-lg font-bold tabular-nums text-amber-300">{fmt(r.best.value)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </GadgetCard>
  )
}
