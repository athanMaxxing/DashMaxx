import { useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, ClipboardCopy, Crown, Newspaper } from 'lucide-react'
import { useRocketLeagueData } from '../../context/RocketLeagueDataContext'
import { pct } from '../../lib/fortnite'
import { playlistLabel } from '../../lib/rocketleague'
import GadgetCard, { GadgetMessage, GadgetSkeleton } from '../GadgetCard'
import RankBadge, { Delta } from '../RankBadge'

/** One night of Rocket League: record, goals, MVPs and everyone's MMR change. */
export default function RlSessionRecap() {
  const { matches, filteredMatches, loading, error } = useRocketLeagueData()
  const [index, setIndex] = useState(0)
  const [copied, setCopied] = useState(false)

  const sessions = useMemo(() => {
    const groups = new Map()
    for (const m of filteredMatches) {
      const k = new Date(m.created_at).toDateString()
      if (!groups.has(k)) groups.set(k, [])
      groups.get(k).push(m)
    }
    return [...groups.entries()].map(([day, list]) => ({ day, matches: list }))
  }, [filteredMatches])

  const current = sessions[Math.min(index, sessions.length - 1)]

  const recap = useMemo(() => {
    if (!current) return null
    const ms = current.matches
    const players = new Map()
    for (const m of ms) {
      for (const s of m.rl_match_stats) {
        const p = players.get(s.player_id) ?? { id: s.player_id, username: s.profiles?.username ?? '?', games: 0, wins: 0, goals: 0, assists: 0, saves: 0, mvps: 0 }
        p.games += 1
        if (m.won) p.wins += 1
        p.goals += s.goals
        p.assists += s.assists
        p.saves += s.saves
        if (s.mvp) p.mvps += 1
        players.set(s.player_id, p)
      }
    }
    const rows = [...players.values()].sort((a, b) => b.mvps - a.mvps || b.goals - a.goals)

    // MMR change this night per player + playlist: last MMR of the night vs the last one before it.
    const dayStart = new Date(current.day).getTime()
    const climbs = []
    const seen = new Set()
    for (const m of ms) {
      if (!m.ranked) continue
      for (const s of m.rl_match_stats) {
        const k = `${s.player_id}|${m.team_size}`
        if (s.mmr == null || seen.has(k)) continue
        seen.add(k) // `ms` is newest first, so this is the night's final MMR
        const before = matches.find(
          (x) =>
            x.ranked &&
            x.team_size === m.team_size &&
            new Date(x.created_at).getTime() < dayStart &&
            x.rl_match_stats.some((y) => y.player_id === s.player_id && y.mmr != null),
        )
        const firstTonight = [...ms]
          .reverse()
          .find((x) => x.ranked && x.team_size === m.team_size && x.rl_match_stats.some((y) => y.player_id === s.player_id && y.mmr != null))
        const start = before
          ? before.rl_match_stats.find((y) => y.player_id === s.player_id).mmr
          : firstTonight.rl_match_stats.find((y) => y.player_id === s.player_id).mmr
        climbs.push({ username: s.profiles?.username ?? '?', playlist: m.team_size, mmr: s.mmr, change: s.mmr - start })
      }
    }
    climbs.sort((a, b) => b.change - a.change)

    return {
      wins: ms.filter((m) => m.won).length,
      goals: ms.reduce((n, m) => n + m.our_goals, 0),
      conceded: ms.reduce((n, m) => n + m.their_goals, 0),
      rows,
      mvp: rows[0]?.mvps > 0 ? rows[0] : null,
      climbs,
    }
  }, [current, matches])

  async function copy() {
    if (!current || !recap) return
    const n = current.matches.length
    const text = [
      `DashMaxx Rocket League recap: ${current.day}`,
      `${recap.wins}W ${n - recap.wins}L (${pct(recap.wins, n)}%) · ${recap.goals} goals for, ${recap.conceded} against`,
      recap.mvp ? `MVP of the night: ${recap.mvp.username} (${recap.mvp.mvps}x MVP)` : '',
      ...recap.climbs.map((c) => `${c.username} ${playlistLabel(c.playlist)}: ${c.change >= 0 ? '+' : ''}${c.change} MMR (now ${c.mmr})`),
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
            <div className="rounded-lg bg-sky-500/10 p-2">
              <p className="text-xl font-bold">
                <span className="text-emerald-400">{recap.wins}</span>
                <span className="text-gray-600">–</span>
                <span className="text-rose-400">{current.matches.length - recap.wins}</span>
              </p>
              <p className="text-[11px] text-gray-400">Record</p>
            </div>
            <div className="rounded-lg bg-gray-950/50 p-2">
              <p className="text-xl font-bold text-gray-200">{recap.goals}</p>
              <p className="text-[11px] text-gray-400">Goals for</p>
            </div>
            <div className="rounded-lg bg-gray-950/50 p-2">
              <p className="text-xl font-bold text-gray-200">{recap.conceded}</p>
              <p className="text-[11px] text-gray-400">Against</p>
            </div>
          </div>

          {recap.mvp && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm">
              <Crown className="h-4 w-4 text-amber-300" />
              <span className="text-gray-300">MVP of the night</span>
              <span className="font-semibold text-amber-200">{recap.mvp.username}</span>
              <span className="ml-auto text-xs text-gray-500">{recap.mvp.mvps}x MVP</span>
            </div>
          )}

          {recap.climbs.length > 0 && (
            <ul className="mb-3 space-y-1">
              {recap.climbs.map((c) => (
                <li key={`${c.username}|${c.playlist}`} className="flex items-center gap-2 rounded-md bg-gray-950/50 px-2.5 py-1.5 text-xs">
                  <span className="font-medium text-gray-200">{c.username}</span>
                  <span className="text-gray-500">{playlistLabel(c.playlist)}</span>
                  <RankBadge mmr={c.mmr} playlist={c.playlist} size="xs" showDivision={false} />
                  <span className="ml-auto font-semibold">{c.change === 0 ? <span className="text-gray-500">±0</span> : <Delta value={c.change} />}</span>
                </li>
              ))}
            </ul>
          )}

          <table className="w-full text-xs">
            <thead className="text-gray-500">
              <tr>
                <th className="py-1 text-left font-medium">Player</th>
                <th className="py-1 text-right font-medium">W/G</th>
                <th className="py-1 text-right font-medium">G</th>
                <th className="py-1 text-right font-medium">A</th>
                <th className="py-1 text-right font-medium">S</th>
                <th className="py-1 text-right font-medium">MVP</th>
              </tr>
            </thead>
            <tbody>
              {recap.rows.map((r) => (
                <tr key={r.id} className="border-t border-gray-800/60">
                  <td className="py-1 font-medium text-gray-200">{r.username}</td>
                  <td className="py-1 text-right tabular-nums text-gray-300">
                    {r.wins}/{r.games}
                  </td>
                  <td className="py-1 text-right tabular-nums text-gray-300">{r.goals}</td>
                  <td className="py-1 text-right tabular-nums text-gray-300">{r.assists}</td>
                  <td className="py-1 text-right tabular-nums text-gray-300">{r.saves}</td>
                  <td className="py-1 text-right tabular-nums text-amber-300">{r.mvps || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </GadgetCard>
  )
}
