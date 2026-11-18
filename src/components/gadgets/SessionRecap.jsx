import { useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, ClipboardCopy, Crown, Newspaper } from 'lucide-react'
import { useSquadData } from '../../context/SquadDataContext'
import { IMPACT_HELP, impactScore, isWin } from '../../lib/overwatch'
import GadgetCard, { GadgetMessage } from '../GadgetCard'

const dayKey = (iso) => new Date(iso).toDateString()

/** Summary of one play session (all matches logged on the same day). */
export default function SessionRecap() {
  const { filteredMatches, loading, error } = useSquadData()
  const [index, setIndex] = useState(0) // 0 = most recent session
  const [copied, setCopied] = useState(false)

  // Newest-first list of sessions.
  const sessions = useMemo(() => {
    const groups = new Map()
    for (const m of filteredMatches) {
      const k = dayKey(m.created_at)
      if (!groups.has(k)) groups.set(k, [])
      groups.get(k).push(m)
    }
    return [...groups.entries()].map(([day, matches]) => ({ day, matches }))
  }, [filteredMatches])

  const current = sessions[Math.min(index, sessions.length - 1)]

  const recap = useMemo(() => {
    if (!current) return null
    const ms = current.matches
    const wins = ms.filter((m) => isWin(m.result)).length
    const players = new Map()
    for (const m of ms) {
      for (const s of m.ow_match_stats) {
        const p = players.get(s.player_id) ?? {
          username: s.profiles?.username ?? 'Unknown',
          games: 0,
          wins: 0,
          elims: 0,
          damage: 0,
          impact: 0,
        }
        p.games += 1
        if (isWin(m.result)) p.wins += 1
        p.elims += s.eliminations ?? 0
        p.damage += s.damage ?? 0
        p.impact += impactScore(s)
        players.set(s.player_id, p)
      }
    }
    const rows = [...players.values()]
      .map((p) => ({ ...p, avgImpact: p.impact / p.games }))
      .sort((a, b) => b.avgImpact - a.avgImpact)
    return { wins, losses: ms.length - wins, rows, mvp: rows[0] }
  }, [current])

  async function copySummary() {
    if (!current || !recap) return
    const lines = [
      `DashMaxx recap — ${current.day}`,
      `${recap.wins}W ${recap.losses}L (${Math.round((recap.wins / current.matches.length) * 100)}%)`,
      `Maps: ${[...current.matches].reverse().map((m) => `${m.map} ${isWin(m.result) ? 'W' : 'L'}`).join(', ')}`,
      recap.mvp ? `MVP: ${recap.mvp.username}` : '',
    ].filter(Boolean)
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  return (
    <GadgetCard
      title="Session Recap"
      icon={Newspaper}
      actions={
        sessions.length > 0 && (
          <div className="flex items-center gap-1">
            <button
              className="btn-ghost p-1.5"
              onClick={() => setIndex((i) => Math.min(i + 1, sessions.length - 1))}
              disabled={index >= sessions.length - 1}
              title="Older session"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              className="btn-ghost p-1.5"
              onClick={() => setIndex((i) => Math.max(i - 1, 0))}
              disabled={index === 0}
              title="Newer session"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button className="btn-ghost p-1.5" onClick={copySummary} title="Copy summary for Discord">
              {copied ? <Check className="h-4 w-4 text-green-400" /> : <ClipboardCopy className="h-4 w-4" />}
            </button>
          </div>
        )
      }
    >
      {error ? (
        <GadgetMessage tone="error">{error}</GadgetMessage>
      ) : loading && sessions.length === 0 ? (
        <GadgetMessage>Loading…</GadgetMessage>
      ) : !current || !recap ? (
        <GadgetMessage>No sessions yet.</GadgetMessage>
      ) : (
        <>
          <div className="mb-3 flex items-baseline justify-between">
            <p className="text-sm font-semibold text-gray-200">{current.day}</p>
            <p className="text-sm">
              <span className="font-bold text-green-400">{recap.wins}W</span>{' '}
              <span className="font-bold text-red-400">{recap.losses}L</span>
              <span className="ml-1 text-xs text-gray-500">
                {Math.round((recap.wins / current.matches.length) * 100)}%
              </span>
            </p>
          </div>

          <div className="mb-3 flex flex-wrap gap-1">
            {[...current.matches].reverse().map((m) => (
              <span
                key={m.id}
                className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                  isWin(m.result) ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'
                }`}
              >
                {m.map}
              </span>
            ))}
          </div>

          {recap.mvp && (
            <div
              className="mb-3 flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm"
              title={IMPACT_HELP}
            >
              <Crown className="h-4 w-4 text-amber-300" />
              <span className="text-gray-300">MVP</span>
              <span className="font-semibold text-amber-200">{recap.mvp.username}</span>
              <span className="ml-auto text-xs text-gray-500">impact {recap.mvp.avgImpact.toFixed(1)}/game</span>
            </div>
          )}

          <table className="w-full text-xs">
            <thead className="text-gray-500">
              <tr>
                <th className="py-1 text-left font-medium">Player</th>
                <th className="py-1 text-right font-medium">W-L</th>
                <th className="py-1 text-right font-medium">Elims/g</th>
                <th className="py-1 text-right font-medium">Dmg/g</th>
              </tr>
            </thead>
            <tbody>
              {recap.rows.map((r) => (
                <tr key={r.username} className="border-t border-gray-800/60">
                  <td className="py-1 font-medium text-gray-200">{r.username}</td>
                  <td className="py-1 text-right tabular-nums text-gray-300">
                    {r.wins}-{r.games - r.wins}
                  </td>
                  <td className="py-1 text-right tabular-nums text-gray-300">{(r.elims / r.games).toFixed(1)}</td>
                  <td className="py-1 text-right tabular-nums text-gray-300">
                    {Math.round(r.damage / r.games).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </GadgetCard>
  )
}
