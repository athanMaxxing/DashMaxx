import { useMemo, useState } from 'react'
import { HeartHandshake } from 'lucide-react'
import { useSquadData } from '../../context/SquadDataContext'
import { isWin } from '../../lib/overwatch'
import GadgetCard, { GadgetMessage, GadgetSkeleton } from '../GadgetCard'

const MIN_GAME_OPTIONS = [1, 3, 5, 10]

/** Win rate for every pair of players who've played together. */
export default function DuoSynergy() {
  const { filteredMatches, usernames, loading, error } = useSquadData()
  const [minGames, setMinGames] = useState(1)

  const { duos, baseline } = useMemo(() => {
    const pairs = new Map()
    let wins = 0
    for (const m of filteredMatches) {
      const won = isWin(m.result)
      if (won) wins += 1
      const ids = [...new Set(m.ow_match_stats.map((s) => s.player_id))].sort()
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const key = `${ids[i]}|${ids[j]}`
          const p = pairs.get(key) ?? { a: ids[i], b: ids[j], games: 0, wins: 0 }
          p.games += 1
          if (won) p.wins += 1
          pairs.set(key, p)
        }
      }
    }
    return {
      baseline: filteredMatches.length ? wins / filteredMatches.length : 0,
      duos: [...pairs.values()]
        .map((p) => ({ ...p, rate: p.wins / p.games }))
        .sort((x, y) => y.rate - x.rate || y.games - x.games),
    }
  }, [filteredMatches])

  const shown = duos.filter((d) => d.games >= minGames)

  return (
    <GadgetCard
      title="Duo Synergy"
      icon={HeartHandshake}
      actions={
        <select
          className="input w-auto py-1 text-xs"
          value={minGames}
          onChange={(e) => setMinGames(Number(e.target.value))}
          aria-label="Minimum games together"
        >
          {MIN_GAME_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}+ games
            </option>
          ))}
        </select>
      }
    >
      {error ? (
        <GadgetMessage tone="error">{error}</GadgetMessage>
      ) : loading && duos.length === 0 ? (
        <GadgetSkeleton />
      ) : shown.length === 0 ? (
        <GadgetMessage>
          {duos.length ? `No duos with ${minGames}+ games together.` : 'Log matches with 2+ players to see duos.'}
        </GadgetMessage>
      ) : (
        <>
          <p className="mb-2 text-xs text-gray-500">
            Squad average: {Math.round(baseline * 100)}% · bars compare each duo to it
          </p>
          <ul className="max-h-[24rem] space-y-1.5 overflow-y-auto pr-1">
            {shown.map((d, i) => {
              const diff = Math.round((d.rate - baseline) * 100)
              return (
                <li key={`${d.a}|${d.b}`} className="rounded-md border border-gray-800 bg-gray-950/50 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-5 text-xs text-gray-500">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-medium text-gray-200">
                      {usernames[d.a] ?? '?'} <span className="text-gray-500">+</span> {usernames[d.b] ?? '?'}
                    </span>
                    <span className="text-xs text-gray-500">{d.games}g</span>
                    <span className={`w-10 text-right font-semibold tabular-nums ${d.rate >= 0.5 ? 'text-green-400' : 'text-red-400'}`}>
                      {Math.round(d.rate * 100)}%
                    </span>
                    <span
                      className={`w-10 text-right text-xs tabular-nums ${diff > 0 ? 'text-green-500' : diff < 0 ? 'text-red-500' : 'text-gray-500'}`}
                    >
                      {diff > 0 ? '+' : ''}
                      {diff}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-800">
                    <div
                      className={`h-full ${d.rate >= baseline ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.round(d.rate * 100)}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </GadgetCard>
  )
}
