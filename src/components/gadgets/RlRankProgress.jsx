import { useMemo, useState } from 'react'
import { Clock, Mountain, TrendingUp } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useSquadData } from '../../context/SquadDataContext'
import { useRocketLeagueData } from '../../context/RocketLeagueDataContext'
import { mmrHistory, rankBands, rankFor, RANKED_PLAYLISTS, TIER_HEX } from '../../lib/rocketleague'
import { PlayerName } from '../Avatar'
import GadgetCard, { GadgetMessage, GadgetSkeleton } from '../GadgetCard'
import RankBadge, { Delta } from '../RankBadge'

const DAY = 24 * 60 * 60 * 1000

/** Line colours for players on the chart, in the order they were picked. */
const PLAYER_COLORS = ['#38bdf8', '#f59e0b', '#e879f9', '#a3e635', '#fb923c', '#2dd4bf', '#f87171', '#818cf8']

/** "3d 4h", "5h", "12 min". */
function duration(ms) {
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${Math.max(mins, 1)} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return hours % 24 ? `${days}d ${hours % 24}h` : `${days}d`
}

/** Current rank, 7-day change, peak and time in rank for one MMR history. */
function summarize(history, playlist) {
  if (!history.length) return null
  const now = history[history.length - 1]
  const rank = rankFor(now.mmr, playlist)
  const peak = history.reduce((a, b) => (b.mmr > a.mmr ? b : a))
  const weekAgo = Date.now() - 7 * DAY
  const before = [...history].reverse().find((h) => new Date(h.at).getTime() < weekAgo)
  const weekStart = before ?? history[0]
  // How long they've been in this rank: walk back while the rank stays the same.
  let since = now
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (rankFor(history[i].mmr, playlist).index !== rank.index) break
    since = history[i]
  }
  return {
    now,
    rank,
    peak,
    week: now.mmr - weekStart.mmr,
    inRankFor: Date.now() - new Date(since.at).getTime(),
    inRankGames: history.length - history.indexOf(since),
    toNext: rank.next != null ? rank.next - now.mmr : null,
  }
}

/** MMR over time for one or more players in one ranked playlist, plus everyone's current rank. */
export default function RlRankProgress() {
  const { user } = useAuth()
  const { profiles, profileById } = useSquadData()
  const { matches, loading, error } = useRocketLeagueData()
  const [playerIds, setPlayerIds] = useState([user.id])
  const [playlist, setPlaylist] = useState(null)

  const toggle = (id) =>
    setPlayerIds((prev) => (prev.includes(id) ? (prev.length > 1 ? prev.filter((x) => x !== id) : prev) : [...prev, id]))

  // Default playlist: the one the first picked player last played ranked.
  const activePlaylist = useMemo(() => {
    if (playlist) return playlist
    const last = matches.find((m) => m.ranked && m.rl_match_stats.some((s) => s.player_id === playerIds[0] && s.mmr != null))
    return last?.team_size ?? 2
  }, [playlist, matches, playerIds])

  const series = useMemo(
    () =>
      playerIds.map((id, i) => {
        const history = mmrHistory(matches, id, activePlaylist)
        return {
          id,
          name: profileById[id]?.username ?? '?',
          color: PLAYER_COLORS[i % PLAYER_COLORS.length],
          history,
          summary: summarize(history, activePlaylist),
        }
      }),
    [playerIds, matches, activePlaylist, profileById],
  )
  const withData = series.filter((s) => s.summary)
  const single = series.length === 1 ? series[0].summary : null

  // Everyone's latest MMR per ranked playlist.
  const squad = useMemo(
    () =>
      profiles
        .map((p) => ({
          ...p,
          ranks: Object.fromEntries(
            RANKED_PLAYLISTS.map((pl) => {
              const h = mmrHistory(matches, p.id, pl.value)
              return [pl.value, h.length ? h[h.length - 1].mmr : null]
            }),
          ),
        }))
        .filter((p) => Object.values(p.ranks).some((v) => v != null)),
    [profiles, matches],
  )

  return (
    <GadgetCard title="Rank Progression" icon={TrendingUp}>
      <div className="mb-3 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {profiles.map((p) => {
            const i = playerIds.indexOf(p.id)
            const on = i !== -1
            const color = on ? PLAYER_COLORS[i % PLAYER_COLORS.length] : null
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                title={on ? (playerIds.length > 1 ? 'Remove from graph' : 'At least one player is shown') : 'Add to graph'}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
                  on ? 'border-white/20 bg-white/[0.06] text-gray-100' : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: color ?? 'transparent', boxShadow: color ? 'none' : 'inset 0 0 0 1px #4b5563' }} />
                {p.id === user.id ? `${p.username} (you)` : p.username}
              </button>
            )
          })}
        </div>
        <div className="flex w-fit gap-1 rounded-lg bg-gray-950/70 p-0.5 ring-1 ring-white/5">
          {RANKED_PLAYLISTS.map((pl) => (
            <button
              key={pl.value}
              onClick={() => setPlaylist(pl.value)}
              title={pl.long}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                activePlaylist === pl.value ? 'bg-sky-500/25 text-sky-100 ring-1 ring-sky-400/50' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {pl.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <GadgetMessage tone="error">{error}</GadgetMessage>
      ) : loading && matches.length === 0 ? (
        <GadgetSkeleton />
      ) : withData.length === 0 ? (
        <GadgetMessage>
          No ranked MMR logged for {series.length === 1 ? series[0].name : 'these players'} in this playlist yet.
        </GadgetMessage>
      ) : (
        <>
          {single ? (
            <>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <RankBadge mmr={single.now.mmr} playlist={activePlaylist} size="lg" />
                  <p className="mt-1.5 font-display text-3xl font-bold tabular-nums text-gray-100">
                    {single.now.mmr}
                    <span className="ml-1 text-sm font-medium text-gray-500">MMR</span>
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-gray-500">Last 7 days</span>
                  <span className="text-right font-semibold">
                    {single.week === 0 ? <span className="text-gray-400">±0</span> : <Delta value={single.week} />}
                  </span>
                  <span className="text-gray-500">Peak</span>
                  <span className="text-right font-semibold tabular-nums text-gray-200">{single.peak.mmr}</span>
                  {single.toNext != null && (
                    <>
                      <span className="text-gray-500">Next rank</span>
                      <span className="text-right font-semibold tabular-nums text-gray-200">+{single.toNext}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="mb-3 flex items-center gap-2 rounded-lg bg-sky-500/10 px-3 py-2 text-xs text-sky-100">
                <Clock className="h-3.5 w-3.5 shrink-0 text-sky-300" />
                <span>
                  In <span className="font-semibold">{single.rank.name}</span> for <span className="font-semibold">{duration(single.inRankFor)}</span> ·{' '}
                  {single.inRankGames} game{single.inRankGames === 1 ? '' : 's'}
                </span>
              </div>
            </>
          ) : (
            <ul className="mb-3 space-y-1">
              {series.map((s) => (
                <li key={s.id} className="flex items-center gap-2 rounded-md bg-gray-950/50 px-2.5 py-1.5 text-xs">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                  <span className="min-w-0 flex-1 truncate font-medium text-gray-200">{s.name}</span>
                  {s.summary ? (
                    <>
                      <RankBadge mmr={s.summary.now.mmr} playlist={activePlaylist} size="xs" />
                      <span className="w-10 text-right font-semibold tabular-nums text-gray-100">{s.summary.now.mmr}</span>
                      <span className="w-12 text-right" title="Last 7 days">
                        {s.summary.week === 0 ? <span className="text-gray-500">±0</span> : <Delta value={s.summary.week} />}
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-600">No games</span>
                  )}
                </li>
              ))}
            </ul>
          )}

          <MmrChart series={withData} playlist={activePlaylist} />
        </>
      )}

      {squad.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            <Mountain className="h-3.5 w-3.5" /> Squad ranks
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-gray-500">
                <tr>
                  <th className="py-1 text-left font-medium">Player</th>
                  {RANKED_PLAYLISTS.map((pl) => (
                    <th key={pl.value} className="px-1 py-1 text-right font-medium">
                      {pl.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {squad.map((p) => (
                  <tr key={p.id} className="border-t border-gray-800/60">
                    <td className={`max-w-[7rem] truncate py-1.5 font-medium ${p.id === user.id ? 'text-indigo-300' : 'text-gray-200'}`}>
                      <PlayerName profile={profileById[p.id] ?? p} />
                    </td>
                    {RANKED_PLAYLISTS.map((pl) => (
                      <td key={pl.value} className="px-1 py-1.5 text-right">
                        {p.ranks[pl.value] != null ? (
                          <button
                            className="inline-flex flex-col items-end gap-0.5"
                            onClick={() => {
                              setPlayerIds([p.id])
                              setPlaylist(pl.value)
                            }}
                            title="Show this graph"
                          >
                            <RankBadge mmr={p.ranks[pl.value]} playlist={pl.value} size="xs" showDivision={false} />
                            <span className="tabular-nums text-[10px] text-gray-500">{p.ranks[pl.value]}</span>
                          </button>
                        ) : (
                          <span className="text-gray-700">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p className="mt-2 text-[11px] text-gray-600">Ranks are worked out from MMR with approximate cutoffs.</p>
    </GadgetCard>
  )
}

/**
 * SVG line chart of MMR per game with rank cutoff lines behind it. With several
 * players, each game gets one slot on the x axis so shared games line up.
 * Hovering (or tapping) a game shows everyone's MMR and rank at that point.
 */
function MmrChart({ series, playlist }) {
  const [hover, setHover] = useState(null)
  const W = 600
  const H = 200
  const PAD = { l: 40, r: 10, t: 10, b: 18 }

  const chart = useMemo(() => {
    // One slot per game any shown player has MMR for, oldest first; last 60 keeps it readable.
    const games = new Map()
    for (const s of series) for (const h of s.history) if (!games.has(h.matchId)) games.set(h.matchId, h)
    const slots = [...games.values()].sort((a, b) => new Date(a.at) - new Date(b.at)).slice(-60)
    const slotOf = new Map(slots.map((g, i) => [g.matchId, i]))
    const lines = series.map((s) => ({
      ...s,
      pts: s.history
        .map((h, i) => ({ ...h, slot: slotOf.get(h.matchId), delta: i > 0 ? h.mmr - s.history[i - 1].mmr : null }))
        .filter((p) => p.slot != null),
    }))
    return { slots, lines }
  }, [series])

  const { slots, lines } = chart
  if (slots.length < 2) {
    return <p className="rounded-lg bg-gray-950/50 px-3 py-4 text-center text-xs text-gray-500">Log one more ranked game to see the graph.</p>
  }

  const values = lines.flatMap((l) => l.pts.map((p) => p.mmr))
  let lo = Math.min(...values)
  let hi = Math.max(...values)
  const pad = Math.max(15, (hi - lo) * 0.15)
  lo = Math.floor(lo - pad)
  hi = Math.ceil(hi + pad)
  const step = (W - PAD.l - PAD.r) / (slots.length - 1)
  const x = (i) => PAD.l + i * step
  const y = (v) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b)
  const bands = rankBands(playlist).filter((b) => b.start > lo && b.start < hi)
  const multi = lines.length > 1

  const hovered = hover == null ? [] : lines.map((l) => ({ line: l, p: l.pts.find((p) => p.slot === hover) })).filter((h) => h.p)
  const hoverGame = hover == null ? null : slots[hover]
  const topY = hovered.length ? Math.min(...hovered.map((h) => y(h.p.mmr))) : 0
  const leftPct = hover == null ? 0 : (x(hover) / W) * 100
  const align = leftPct > 70 ? '-100%' : leftPct < 30 ? '0%' : '-50%'

  return (
    <div className="relative" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full touch-pan-y" role="img" aria-label="MMR over time">
        <defs>
          <linearGradient id="mmr-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lines[0].color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={lines[0].color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {bands.map((b) => (
          <g key={b.start}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(b.start)} y2={y(b.start)} stroke={TIER_HEX[b.tier]} strokeOpacity="0.35" strokeDasharray="4 4" />
            <text x={W - PAD.r - 2} y={y(b.start) - 3} textAnchor="end" fontSize="10" fill={TIER_HEX[b.tier]} fillOpacity="0.8">
              {b.name}
            </text>
          </g>
        ))}
        {[lo, Math.round((lo + hi) / 2), hi].map((v) => (
          <text key={v} x={PAD.l - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill="#6b7280">
            {v}
          </text>
        ))}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="#9ca3af" strokeOpacity="0.4" />}
        {lines.map((l) => {
          if (!l.pts.length) return null
          const d = l.pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.slot).toFixed(1)},${y(p.mmr).toFixed(1)}`).join(' ')
          const first = l.pts[0]
          const last = l.pts[l.pts.length - 1]
          return (
            <g key={l.id}>
              {!multi && (
                <path d={`${d} L${x(last.slot).toFixed(1)},${H - PAD.b} L${x(first.slot).toFixed(1)},${H - PAD.b} Z`} fill="url(#mmr-fill)" />
              )}
              <path d={d} fill="none" stroke={l.color} strokeWidth="2" strokeLinejoin="round" />
              {l.pts.map((p) => {
                const on = p.slot === hover
                const fill = multi ? l.color : p.won ? '#34d399' : '#fb7185'
                return <circle key={p.matchId} cx={x(p.slot)} cy={y(p.mmr)} r={on ? 5 : 3} fill={fill} stroke={on ? '#f9fafb' : 'none'} strokeWidth="1.5" />
              })}
            </g>
          )
        })}
        {/* Invisible column per game so hovering anywhere near a point picks it up. */}
        {slots.map((g, i) => (
          <rect
            key={g.matchId}
            x={x(i) - step / 2}
            y={0}
            width={step}
            height={H}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onClick={() => setHover((h) => (h === i ? null : i))}
          />
        ))}
        <text x={PAD.l} y={H - 4} fontSize="10" fill="#6b7280">
          {new Date(slots[0].at).toLocaleDateString()}
        </text>
        <text x={W - PAD.r} y={H - 4} textAnchor="end" fontSize="10" fill="#6b7280">
          {new Date(slots[slots.length - 1].at).toLocaleDateString()}
        </text>
      </svg>

      {hoverGame && hovered.length > 0 && (
        <div
          className="pointer-events-none absolute z-10 min-w-[9rem] rounded-lg border border-white/10 bg-gray-900/95 px-2.5 py-2 text-xs shadow-xl backdrop-blur"
          style={{ left: `${leftPct}%`, top: `${(topY / H) * 100}%`, transform: `translate(${align}, calc(-100% - 10px))` }}
        >
          <p className="mb-1.5 flex items-center justify-between gap-3 text-[11px] text-gray-400">
            <span>{new Date(hoverGame.at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
            <span className={hoverGame.won ? 'font-semibold text-emerald-400' : 'font-semibold text-rose-400'}>{hoverGame.won ? 'Win' : 'Loss'}</span>
          </p>
          <ul className="space-y-1.5">
            {hovered.map(({ line, p }) => (
              <li key={line.id}>
                {multi && (
                  <p className="flex items-center gap-1.5 text-[11px] text-gray-300">
                    <span className="h-2 w-2 rounded-full" style={{ background: line.color }} />
                    {line.name}
                  </p>
                )}
                <p className="flex items-baseline gap-1.5">
                  <span className="text-base font-bold tabular-nums text-gray-100">{p.mmr}</span>
                  <span className="text-gray-500">MMR</span>
                  {p.delta != null && <Delta value={p.delta} />}
                </p>
                <RankBadge mmr={p.mmr} playlist={playlist} size="xs" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
