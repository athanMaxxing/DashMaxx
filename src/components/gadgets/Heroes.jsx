import { useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useSquadData } from '../../context/SquadDataContext'
import { useFortniteData } from '../../context/FortniteDataContext'
import { useRocketLeagueData } from '../../context/RocketLeagueDataContext'
import { isWin } from '../../lib/overwatch'
import { pct, totalKills } from '../../lib/fortnite'
import { mmrHistory, RANKED_PLAYLISTS, rankFor, TIER_HEX } from '../../lib/rocketleague'
import { Chevrons, DeltaBars, GAME_COLORS, HeroPanel, ResultBars, Score, StatTile } from '../Hud'

const DAY = 24 * 60 * 60 * 1000
const WEEK = 7 * DAY

/** Start of "tonight": 5am today, or 5am yesterday if it's still the early hours. */
function sessionStart(now) {
  const d = new Date(now)
  if (d.getHours() < 5) d.setDate(d.getDate() - 1)
  d.setHours(5, 0, 0, 0)
  return d.getTime()
}

/** "2h 14m" */
function span(ms) {
  const m = Math.max(1, Math.round(ms / 60000))
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`
}

/** Current run of wins at the end of a list (oldest first). */
function winStreak(results) {
  let n = 0
  for (let i = results.length - 1; i >= 0 && results[i]; i -= 1) n += 1
  return n
}

function LiveTag() {
  return <span className="para bg-rose-500 px-3 font-display text-xs font-extrabold tracking-[0.16em] text-white">LIVE</span>
}

/** Tonight across every game: total record, every game as a bar, per-game split. */
export function TonightHero() {
  const { matches: ow } = useSquadData()
  const { matches: fn } = useFortniteData()
  const { matches: rl } = useRocketLeagueData()
  const [now] = useState(() => Date.now())

  const t = useMemo(() => {
    const from = sessionStart(now)
    const at = (m) => new Date(m.created_at).getTime()
    const games = [
      ...ow.filter((m) => at(m) >= from).map((m) => ({ id: `ow${m.id}`, game: 'overwatch', win: isWin(m.result), at: at(m) })),
      ...fn.filter((m) => at(m) >= from).map((m) => ({ id: `fn${m.id}`, game: 'fortnite', win: m.won, at: at(m) })),
      ...rl.filter((m) => at(m) >= from).map((m) => ({ id: `rl${m.id}`, game: 'rocketleague', win: m.won, at: at(m) })),
    ].sort((a, b) => a.at - b.at)
    const per = ['overwatch', 'fortnite', 'rocketleague']
      .map((g) => {
        const gs = games.filter((x) => x.game === g)
        return { game: g, n: gs.length, w: gs.filter((x) => x.win).length }
      })
      .filter((p) => p.n)
    const wins = games.filter((g) => g.win).length
    return {
      games,
      per,
      wins,
      losses: games.length - wins,
      streak: winStreak(games.map((g) => g.win)),
      live: games.length > 0 && now - games[games.length - 1].at < 45 * 60 * 1000,
      length: games.length > 1 ? games[games.length - 1].at - games[0].at : 0,
    }
  }, [ow, fn, rl, now])

  const SHORT = { overwatch: 'OW', fortnite: 'FN', rocketleague: 'RL' }

  return (
    <HeroPanel color="#e879f9" deep="#2b0f45">
      <div className="flex items-center justify-between gap-2">
        <span className="lbl text-indigo-200">
          Tonight{t.games.length > 0 && ` · ${t.games.length} game${t.games.length === 1 ? '' : 's'}`}
          {t.length > 0 && ` · ${span(t.length)}`}
        </span>
        {t.live && <LiveTag />}
      </div>
      {t.games.length === 0 ? (
        <div className="py-4">
          <p className="font-display text-3xl font-extrabold uppercase italic text-gray-100">No games yet tonight</p>
          <p className="mt-1 text-sm text-gray-400">Log one from a game tab and tonight&apos;s scoreboard starts here.</p>
        </div>
      ) : (
        <>
          <div className="mt-3 flex items-end gap-4">
            <Score left={t.wins} right={t.losses} color="#e879f9" />
            {t.streak >= 2 && (
              <div className="ml-auto flex flex-col items-end gap-1">
                <span className="lbl">Win streak</span>
                <div className="flex gap-0.5" role="img" aria-label={`${t.streak} wins in a row`}>
                  {Array.from({ length: Math.min(t.streak, 6) }, (_, i) => (
                    <span key={i} className="chev h-[18px] w-6" style={{ background: '#4ade80', opacity: 1 - i * 0.12 }} />
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="mt-4">
            <ResultBars
              items={t.games.map((g) => ({ key: g.id, win: g.win, color: GAME_COLORS[g.game] }))}
              height={46}
              label={`Tonight's ${t.games.length} games in order. Tall bars are wins, short bars are losses, coloured by game.`}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {t.per.map((p) => (
                <span
                  key={p.game}
                  className="para bg-white/[0.06] px-3 py-0.5 font-display text-xs font-extrabold uppercase tracking-wider"
                  style={{ color: GAME_COLORS[p.game], borderBottom: `2px solid ${GAME_COLORS[p.game]}` }}
                >
                  {SHORT[p.game]} {p.game === 'fortnite' ? `${p.w} VR · ${p.n} games` : `${p.w}–${p.n - p.w}`}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <YouTonight />
          </div>
        </>
      )}
    </HeroPanel>
  )
}

/** Overwatch: this week's record and form. Follows the OW filters. */
export function OwHero() {
  const { filteredMatches } = useSquadData()
  const [now] = useState(() => Date.now())
  const d = useMemo(() => {
    const week = filteredMatches.filter((m) => now - new Date(m.created_at).getTime() < WEEK)
    const w = week.filter((m) => isWin(m.result)).length
    const last = filteredMatches.slice(0, 15).reverse()
    return { n: week.length, w, last }
  }, [filteredMatches, now])
  const c = GAME_COLORS.overwatch
  const latest = d.last[d.last.length - 1]

  return (
    <HeroPanel color={c} deep="#4a1d06" flip>
      <div className="flex items-baseline justify-between">
        <span className="lbl text-orange-200">This week</span>
        <span className="lbl">{d.n} matches</span>
      </div>
      <div className="mt-3 flex items-end gap-4">
        <Score left={d.w} right={d.n - d.w} color={c} />
        <div className="ml-auto text-right">
          <p className="num text-3xl font-bold text-orange-300">{pct(d.w, d.n)}%</p>
          <p className="lbl">Win rate</p>
        </div>
      </div>
      {d.last.length > 1 && (
        <div className="mt-4">
          <ResultBars
            items={d.last.map((m) => ({ key: m.id, win: isWin(m.result), color: c, title: `${m.map} · ${m.result}` }))}
            height={42}
            label={`Last ${d.last.length} matches, oldest first. Tall bars are wins.`}
          />
          <div className="mt-1 flex justify-between">
            <span className="lbl">{d.last.length} matches ago</span>
            {latest && (
              <span className="lbl text-orange-200">
                Latest · {latest.map} {isWin(latest.result) ? 'W' : 'L'}
              </span>
            )}
          </div>
        </div>
      )}
    </HeroPanel>
  )
}

/** Fortnite: Victory Royales this week and kills per game. Follows the FN filters. */
export function FnHero() {
  const { filteredMatches } = useFortniteData()
  const [now] = useState(() => Date.now())
  const d = useMemo(() => {
    const week = filteredMatches.filter((m) => now - new Date(m.created_at).getTime() < WEEK)
    const kills = week.reduce((n, m) => n + totalKills(m), 0)
    return { n: week.length, vr: week.filter((m) => m.won).length, kpg: week.length ? kills / week.length : 0, last: filteredMatches.slice(0, 14).reverse() }
  }, [filteredMatches, now])
  const c = GAME_COLORS.fortnite
  const latest = d.last[d.last.length - 1]

  return (
    <HeroPanel color={c} deep="#3a2f05">
      <div className="flex items-baseline justify-between">
        <span className="lbl text-yellow-200">Victory Royales · this week</span>
        <span className="lbl">{d.n} games</span>
      </div>
      <div className="mt-3 flex items-end gap-3">
        <svg width="44" height="36" viewBox="0 0 44 36" aria-hidden="true">
          <path d="M2 30 L6 6 L16 18 L22 2 L28 18 L38 6 L42 30 Z" fill={c} />
          <rect x="2" y="31" width="40" height="5" fill="#ca8a04" />
        </svg>
        <span className="inline-block -skew-x-[8deg] font-display text-7xl font-extrabold italic leading-[0.8] text-yellow-300 sm:text-8xl">{d.vr}</span>
        <div className="ml-auto text-right">
          <p className="num text-3xl font-bold">{d.kpg.toFixed(1)}</p>
          <p className="lbl">Squad kills / game</p>
        </div>
      </div>
      {d.last.length > 1 && (
        <div className="mt-4">
          <ResultBars
            items={d.last.map((m) => ({
              key: m.id,
              value: totalKills(m),
              color: m.won ? c : '#5c5468',
              title: `${totalKills(m)} kills${m.won ? ' · Victory Royale' : ''}`,
            }))}
            height={54}
            label={`Squad kills in the last ${d.last.length} games, oldest first. Gold bars are Victory Royales.`}
          />
          <div className="mt-1 flex justify-between">
            <span className="lbl">Kills per game</span>
            {latest && (
              <span className="lbl text-yellow-200">
                Latest · {totalKills(latest)} kills{latest.won ? ', win' : ''}
              </span>
            )}
          </div>
        </div>
      )}
    </HeroPanel>
  )
}

/** Rocket League: your rank, progress to the next rank and MMR change per game. */
export function RlHero() {
  const { user } = useAuth()
  const { matches } = useRocketLeagueData()
  const [picked, setPicked] = useState(null)
  const [now] = useState(() => Date.now())

  const lastPlayed = useMemo(
    () => matches.find((m) => m.ranked && m.rl_match_stats.some((s) => s.player_id === user.id && s.mmr != null))?.team_size ?? 2,
    [matches, user.id],
  )
  const playlist = picked ?? lastPlayed
  const history = useMemo(() => mmrHistory(matches, user.id, playlist), [matches, user.id, playlist])
  const c = GAME_COLORS.rocketleague

  const d = useMemo(() => {
    if (!history.length) return null
    const nowEntry = history[history.length - 1]
    const rank = rankFor(nowEntry.mmr, playlist)
    const before = [...history].reverse().find((h) => now - new Date(h.at).getTime() >= WEEK) ?? history[0]
    const deltas = history.slice(1).map((h, i) => ({ key: h.matchId, value: h.mmr - history[i].mmr, title: `${h.mmr} MMR (${h.mmr - history[i].mmr >= 0 ? '+' : ''}${h.mmr - history[i].mmr})` }))
    const progress = rank.next != null ? (nowEntry.mmr - rank.start) / (rank.next - rank.start) : 1
    return { mmr: nowEntry.mmr, rank, week: nowEntry.mmr - before.mmr, deltas: deltas.slice(-16), progress }
  }, [history, playlist, now])

  const short = d?.rank.short.replace(/[a-z ]/g, '').replace('III', '3').replace('II', '2').replace('I', '1')

  return (
    <HeroPanel color={c} deep="#0b3a5c" flip>
      <div className="flex flex-wrap items-center gap-1">
        {RANKED_PLAYLISTS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPicked(p.value)}
            className={`para px-3.5 py-0.5 font-display text-sm font-extrabold tracking-wider transition ${
              playlist === p.value ? 'bg-sky-400 text-sky-950' : 'bg-white/[0.07] text-gray-300 hover:bg-white/[0.12]'
            }`}
            title={p.long}
          >
            {p.label}
          </button>
        ))}
        <span className="lbl ml-auto">Your rank</span>
      </div>
      {!d ? (
        <p className="py-6 text-sm text-gray-400">Log a ranked game with your MMR and your rank shows up here.</p>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-5">
            <div
              className="m-2 flex h-16 w-16 shrink-0 rotate-45 items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${TIER_HEX[d.rank.tier]}, #1e1b4b)`, boxShadow: `0 0 0 3px #0a1d33, 0 0 0 4px ${TIER_HEX[d.rank.tier]}` }}
            >
              <span className="-rotate-45 font-display text-xl font-extrabold text-gray-950">{short}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-3xl font-extrabold uppercase italic leading-none" style={{ color: TIER_HEX[d.rank.tier] }}>
                {d.rank.name}
              </p>
              <p className="num mt-1 text-2xl font-bold">
                {d.mmr}{' '}
                {d.week !== 0 && (
                  <span className={`text-sm ${d.week > 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
                    {d.week > 0 ? '+' : ''}
                    {d.week} this week
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <Chevrons value={d.progress} color={TIER_HEX[d.rank.tier]} segments={8} height={12} label={`${Math.round(d.progress * 100)}% of the way to the next rank`} />
            <div className="mt-1 flex justify-between">
              <span className="lbl">{d.rank.division ? `Div ${d.rank.division}` : 'Top rank'}</span>
              {d.rank.next != null && <span className="lbl" style={{ color: TIER_HEX[d.rank.tier] }}>{d.rank.next - d.mmr} to next rank</span>}
            </div>
          </div>
          {d.deltas.length > 1 && (
            <div className="mt-4">
              <p className="lbl mb-1">MMR per game · last {d.deltas.length}</p>
              <DeltaBars items={d.deltas} height={72} up={c} label="MMR gained (up) or lost (down) in each recent ranked game" />
            </div>
          )}
        </>
      )}
    </HeroPanel>
  )
}

/** Per-game tiles for the signed-in player tonight (used under the Tonight hero). */
export function YouTonight() {
  const { user } = useAuth()
  const { matches: ow } = useSquadData()
  const { matches: fn } = useFortniteData()
  const { matches: rl } = useRocketLeagueData()
  const [now] = useState(() => Date.now())
  const tiles = useMemo(() => {
    const from = sessionStart(now)
    const tonight = (m) => new Date(m.created_at).getTime() >= from
    const out = []
    const owMine = ow.filter(tonight).flatMap((m) => m.ow_match_stats.filter((s) => s.player_id === user.id).map((s) => ({ ...s, win: isWin(m.result) })))
    if (owMine.length) out.push({ label: 'OW', color: GAME_COLORS.overwatch, value: `${owMine.filter((s) => s.win).length}–${owMine.filter((s) => !s.win).length}`, sub: `${owMine.reduce((n, s) => n + (s.eliminations ?? 0), 0)} elims` })
    const fnMine = fn.filter(tonight).flatMap((m) => m.fn_match_stats.filter((s) => s.player_id === user.id).map((s) => ({ ...s, win: m.won })))
    if (fnMine.length) out.push({ label: 'FN', color: GAME_COLORS.fortnite, value: `${fnMine.reduce((n, s) => n + (s.kills ?? 0), 0)} kills`, sub: `${fnMine.filter((s) => s.win).length} Victory Royale` })
    const rlMine = rl.filter(tonight).flatMap((m) => m.rl_match_stats.filter((s) => s.player_id === user.id).map((s) => ({ ...s, win: m.won })))
    if (rlMine.length) out.push({ label: 'RL', color: GAME_COLORS.rocketleague, value: `${rlMine.reduce((n, s) => n + s.goals, 0)} goals`, sub: `${rlMine.filter((s) => s.win).length}–${rlMine.filter((s) => !s.win).length}` })
    return out
  }, [ow, fn, rl, user.id, now])
  if (!tiles.length) return null
  return (
    <div className="grid grid-cols-3 gap-2">
      {tiles.map((t) => (
        <StatTile key={t.label} label={`You · ${t.label}`} value={t.value} sub={t.sub} color={t.color} />
      ))}
    </div>
  )
}
