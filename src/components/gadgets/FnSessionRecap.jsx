import { useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, ClipboardCopy, Crown, Newspaper } from 'lucide-react'
import { useFortniteData } from '../../context/FortniteDataContext'
import { pct, totalKills } from '../../lib/fortnite'
import GadgetCard, { GadgetMessage, GadgetSkeleton } from '../GadgetCard'

/** One night of Fortnite: wins, kills and the top fragger. */
export default function FnSessionRecap() {
  const { filteredMatches, loading, error } = useFortniteData()
  const [index, setIndex] = useState(0)
  const [copied, setCopied] = useState(false)

  const sessions = useMemo(() => {
    const groups = new Map()
    for (const m of filteredMatches) {
      const k = new Date(m.created_at).toDateString()
      if (!groups.has(k)) groups.set(k, [])
      groups.get(k).push(m)
    }
    return [...groups.entries()].map(([day, matches]) => ({ day, matches }))
  }, [filteredMatches])

  const current = sessions[Math.min(index, sessions.length - 1)]

  const recap = useMemo(() => {
    if (!current) return null
    const ms = current.matches
    const players = new Map()
    for (const m of ms) {
      for (const s of m.fn_match_stats) {
        const p = players.get(s.player_id) ?? { username: s.profiles?.username ?? '?', games: 0, wins: 0, kills: 0 }
        p.games += 1
        if (m.won) p.wins += 1
        p.kills += s.kills
        players.set(s.player_id, p)
      }
    }
    const rows = [...players.values()].sort((a, b) => b.kills - a.kills)
    return {
      wins: ms.filter((m) => m.won).length,
      kills: ms.reduce((n, m) => n + totalKills(m), 0),
      rows,
      top: rows[0]?.kills > 0 ? rows[0] : null,
    }
  }, [current])

  async function copy() {
    if (!current || !recap) return
    const text = [
      `DashMaxx Fortnite recap — ${current.day}`,
      `${recap.wins} Victory Royale${recap.wins === 1 ? '' : 's'} in ${current.matches.length} games (${pct(recap.wins, current.matches.length)}%)`,
      `${recap.kills} squad kills`,
      recap.top ? `Top fragger: ${recap.top.username} (${recap.top.kills} kills)` : '',
    ]
      .filter(Boolean)
      .join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <GadgetCard
      title="Session Recap"
      icon={Newspaper}
      actions={
        sessions.length > 0 && (
          <div className="flex items-center gap-1">
            <button className="btn-ghost p-1.5" onClick={() => setIndex((i) => Math.min(i + 1, sessions.length - 1))} disabled={index >= sessions.length - 1} title="Older">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="btn-ghost p-1.5" onClick={() => setIndex((i) => Math.max(i - 1, 0))} disabled={index === 0} title="Newer">
              <ChevronRight className="h-4 w-4" />
            </button>
            <button className="btn-ghost p-1.5" onClick={copy} title="Copy summary for Discord">
              {copied ? <Check className="h-4 w-4 text-green-400" /> : <ClipboardCopy className="h-4 w-4" />}
            </button>
          </div>
        )
      }
    >
      {error ? (
        <GadgetMessage tone="error">{error}</GadgetMessage>
      ) : loading && sessions.length === 0 ? (
        <GadgetSkeleton />
      ) : !current || !recap ? (
        <GadgetMessage>No sessions yet.</GadgetMessage>
      ) : (
        <>
          <p className="mb-3 text-sm font-semibold text-gray-200">{current.day}</p>
          <div className="mb-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-amber-500/10 p-2">
              <p className="text-xl font-bold text-amber-300">{recap.wins}</p>
              <p className="text-[11px] text-gray-400">Wins</p>
            </div>
            <div className="rounded-lg bg-gray-950/50 p-2">
              <p className="text-xl font-bold text-gray-200">{current.matches.length}</p>
              <p className="text-[11px] text-gray-400">Games</p>
            </div>
            <div className="rounded-lg bg-gray-950/50 p-2">
              <p className="text-xl font-bold text-gray-200">{recap.kills}</p>
              <p className="text-[11px] text-gray-400">Squad kills</p>
            </div>
          </div>
          {recap.top && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm">
              <Crown className="h-4 w-4 text-amber-300" />
              <span className="text-gray-300">Top fragger</span>
              <span className="font-semibold text-amber-200">{recap.top.username}</span>
              <span className="ml-auto text-xs text-gray-500">{recap.top.kills} kills</span>
            </div>
          )}
          <table className="w-full text-xs">
            <thead className="text-gray-500">
              <tr>
                <th className="py-1 text-left font-medium">Player</th>
                <th className="py-1 text-right font-medium">Wins</th>
                <th className="py-1 text-right font-medium">Kills</th>
                <th className="py-1 text-right font-medium">Kills/g</th>
              </tr>
            </thead>
            <tbody>
              {recap.rows.map((r) => (
                <tr key={r.username} className="border-t border-gray-800/60">
                  <td className="py-1 font-medium text-gray-200">{r.username}</td>
                  <td className="py-1 text-right tabular-nums text-gray-300">
                    {r.wins}/{r.games}
                  </td>
                  <td className="py-1 text-right tabular-nums text-gray-300">{r.kills}</td>
                  <td className="py-1 text-right tabular-nums text-gray-300">{(r.kills / r.games).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </GadgetCard>
  )
}
