import { useMemo } from 'react'
import { Flame, Users2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useSquadData } from '../../context/SquadDataContext'
import { IMPACT_HELP, impactScore, isWin } from '../../lib/overwatch'
import GadgetCard, { GadgetMessage, GadgetSkeleton } from '../GadgetCard'

const TOP_N = 4
const HOT_WINDOW = 5 // last N games
const HOT_WINS = 4 // wins needed in that window

/** Each player's best heroes by games played, with win rate and average impact. */
export default function HeroPool() {
  const { user } = useAuth()
  const myId = user.id
  const { filteredMatches, loading, error } = useSquadData()

  const players = useMemo(() => {
    const byPlayer = new Map()
    // filteredMatches is newest-first, so the first HOT_WINDOW games per player are their latest.
    for (const m of filteredMatches) {
      const won = isWin(m.result)
      for (const s of m.ow_match_stats) {
        let p = byPlayer.get(s.player_id)
        if (!p) {
          p = { id: s.player_id, username: s.profiles?.username ?? 'Unknown', games: 0, recent: [], heroes: new Map() }
          byPlayer.set(s.player_id, p)
        }
        p.games += 1
        if (p.recent.length < HOT_WINDOW) p.recent.push(won)
        const name = s.hero?.trim()
        if (!name) continue
        const key = name.toLowerCase()
        const h = p.heroes.get(key) ?? { name, games: 0, wins: 0, impact: 0 }
        h.games += 1
        if (won) h.wins += 1
        h.impact += impactScore(s)
        p.heroes.set(key, h)
      }
    }
    return [...byPlayer.values()]
      .map((p) => ({
        ...p,
        hot: p.recent.length >= HOT_WINDOW && p.recent.filter(Boolean).length >= HOT_WINS,
        top: [...p.heroes.values()]
          .sort((a, b) => b.games - a.games || b.wins / b.games - a.wins / a.games)
          .slice(0, TOP_N),
      }))
      .sort((a, b) => (a.id === myId ? -1 : b.id === myId ? 1 : b.games - a.games))
  }, [filteredMatches, myId])

  return (
    <GadgetCard title="Hero Pool" icon={Users2}>
      {error ? (
        <GadgetMessage tone="error">{error}</GadgetMessage>
      ) : loading && players.length === 0 ? (
        <GadgetSkeleton />
      ) : players.length === 0 ? (
        <GadgetMessage>Log some matches with heroes to fill this in.</GadgetMessage>
      ) : (
        <ul className="max-h-[26rem] space-y-3 overflow-y-auto pr-1">
          {players.map((p) => (
            <li key={p.id}>
              <div className="mb-1.5 flex items-center gap-2">
                <span className={`text-sm font-semibold ${p.id === user.id ? 'text-indigo-300' : 'text-gray-200'}`}>
                  {p.username}
                </span>
                <span className="text-xs text-gray-500">{p.games} games</span>
                {p.hot && (
                  <span
                    className="flex items-center gap-0.5 para bg-orange-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-orange-300"
                    title={`Won ${HOT_WINS}+ of their last ${HOT_WINDOW} games`}
                  >
                    <Flame className="h-3 w-3" /> On fire
                  </span>
                )}
              </div>
              {p.top.length === 0 ? (
                <p className="text-xs text-gray-500">No heroes recorded.</p>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {p.top.map((h) => {
                    const wr = Math.round((h.wins / h.games) * 100)
                    return (
                      <div
                        key={h.name}
                        className="rounded-md border border-gray-800 bg-gray-950/50 px-2 py-1.5"
                        title={`Avg impact ${(h.impact / h.games).toFixed(1)} · ${IMPACT_HELP}`}
                      >
                        <p className="truncate text-xs font-medium text-gray-200">{h.name}</p>
                        <p className="text-[11px] text-gray-500">
                          {h.games}g ·{' '}
                          <span className={wr >= 50 ? 'text-green-400' : 'text-red-400'}>{wr}%</span>
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </GadgetCard>
  )
}
