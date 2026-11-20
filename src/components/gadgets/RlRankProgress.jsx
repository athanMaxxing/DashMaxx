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

/** "3d 4h", "5h", "12 min". */
function duration(ms) {
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${Math.max(mins, 1)} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return hours % 24 ? `${days}d ${hours % 24}h` : `${days}d`
}

/** MMR over time for one player in one ranked playlist, plus everyone's current rank. */
export default function RlRankProgress() {
  const { user } = useAuth()
  const { profiles, profileById } = useSquadData()
  const { matches, loading, error } = useRocketLeagueData()
  const [playerId, setPlayerId] = useState(user.id)
  const [playlist, setPlaylist] = useState(null)

  // Default playlist: the one this player last played ranked.
  const activePlaylist = useMemo(() => {
    if (playlist) return playlist
    const last = matches.find((m) => m.ranked && m.rl_match_stats.some((s) => s.player_id === playerId && s.mmr != null))
    return last?.team_size ?? 2
  }, [playlist, matches, playerId])

  const history = useMemo(() => mmrHistory(matches, playerId, activePlaylist), [matches, playerId, activePlaylist])

  const summary = useMemo(() => {
    if (!history.length) return null
    const now = history[history.length - 1]
    const rank = rankFor(now.mmr, activePlaylist)
    const peak = history.reduce((a, b) => (b.mmr > a.mmr ? b : a))
    const weekAgo = Date.now() - 7 * DAY
    const before = [...history].reverse().find((h) => new Date(h.at).getTime() < weekAgo)
    const weekStart = before ?? history[0]
    // How long they've been in this rank: walk back while the rank stays the same.
    let since = now
    for (let i = history.length - 1; i >= 0; i -= 1) {
      if (rankFor(history[i].mmr, activePlaylist).index !== rank.index) break
      since = history[i]
    }
    const reachedAt = new Date(since.at).getTime()
    return {
      now,
      rank,
      peak,
      week: now.mmr - weekStart.mmr,
      inRankFor: Date.now() - reachedAt,
      inRankGames: history.length - history.indexOf(since),
      toNext: rank.next != null ? rank.next - now.mmr : null,
    }
  }, [history, activePlaylist])

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
      <div className="mb-3 flex flex-wrap gap-2">
        <select className="input w-auto py-1 text-xs" value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id === user.id ? `${p.username} (you)` : p.username}
            </option>
          ))}
        </select>
        <div className="flex gap-1 rounded-lg bg-gray-950/70 p-0.5 ring-1 ring-white/5">
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
      ) : !summary ? (
        <GadgetMessage>No ranked MMR logged for {profileById[playerId]?.username ?? 'this player'} in this playlist yet.</GadgetMessage>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <RankBadge mmr={summary.now.mmr} playlist={activePlaylist} size="lg" />
              <p className="mt-1.5 font-display text-3xl font-bold tabular-nums text-gray-100">
                {summary.now.mmr}
                <span className="ml-1 text-sm font-medium text-gray-500">MMR</span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-gray-500">Last 7 days</span>
              <span className="text-right font-semibold">
                {summary.week === 0 ? <span className="text-gray-400">±0</span> : <Delta value={summary.week} />}
              </span>
              <span className="text-gray-500">Peak</span>
              <span className="text-right font-semibold tabular-nums text-gray-200">{summary.peak.mmr}</span>
              {summary.toNext != null && (
                <>
                  <span className="text-gray-500">Next rank</span>
                  <span className="text-right font-semibold tabular-nums text-gray-200">+{summary.toNext}</span>
                </>
              )}
            </div>
          </div>

          <div className="mb-3 flex items-center gap-2 rounded-lg bg-sky-500/10 px-3 py-2 text-xs text-sky-100">
            <Clock className="h-3.5 w-3.5 shrink-0 text-sky-300" />
            <span>
              In <span className="font-semibold">{summary.rank.name}</span> for <span className="font-semibold">{duration(summary.inRankFor)}</span> ·{' '}
              {summary.inRankGames} game{summary.inRankGames === 1 ? '' : 's'}
            </span>
          </div>

          <MmrChart history={history} playlist={activePlaylist} />
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
                              setPlayerId(p.id)
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

/** Small SVG line chart of MMR per game, with rank cutoff lines behind it. */
function MmrChart({ history, playlist }) {
  const W = 600
  const H = 200
  const PAD = { l: 40, r: 10, t: 10, b: 18 }
  const pts = history.slice(-60) // last 60 games keeps it readable
  if (pts.length < 2) {
    return <p className="rounded-lg bg-gray-950/50 px-3 py-4 text-center text-xs text-gray-500">Log one more ranked game to see the graph.</p>
  }
  const values = pts.map((p) => p.mmr)
  let lo = Math.min(...values)
  let hi = Math.max(...values)
  const pad = Math.max(15, (hi - lo) * 0.15)
  lo = Math.floor(lo - pad)
  hi = Math.ceil(hi + pad)
  const x = (i) => PAD.l + (i / (pts.length - 1)) * (W - PAD.l - PAD.r)
  const y = (v) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b)
  const bands = rankBands(playlist).filter((b) => b.start > lo && b.start < hi)
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.mmr).toFixed(1)}`).join(' ')
  const area = `${line} L${x(pts.length - 1).toFixed(1)},${H - PAD.b} L${x(0).toFixed(1)},${H - PAD.b} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="MMR over time">
      <defs>
        <linearGradient id="mmr-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
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
      <path d={area} fill="url(#mmr-fill)" />
      <path d={line} fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={p.matchId} cx={x(i)} cy={y(p.mmr)} r="3" fill={p.won ? '#34d399' : '#fb7185'}>
          <title>
            {p.mmr} MMR · {p.won ? 'Win' : 'Loss'} · {new Date(p.at).toLocaleString()}
          </title>
        </circle>
      ))}
      <text x={PAD.l} y={H - 4} fontSize="10" fill="#6b7280">
        {new Date(pts[0].at).toLocaleDateString()}
      </text>
      <text x={W - PAD.r} y={H - 4} textAnchor="end" fontSize="10" fill="#6b7280">
        {new Date(pts[pts.length - 1].at).toLocaleDateString()}
      </text>
    </svg>
  )
}
