import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowRight, CalendarCheck, Flag, Quote, Radio, Target, Trophy } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useRealtime } from '../../lib/useRealtime'
import { dailyIndex, timeAgo } from '../../lib/time'
import { isWin } from '../../lib/overwatch'
import { pct, totalKills } from '../../lib/fortnite'
import { useSquadData } from '../../context/SquadDataContext'
import { useFortniteData } from '../../context/FortniteDataContext'
import { useRocketLeagueData } from '../../context/RocketLeagueDataContext'
import GadgetCard, { GadgetMessage, GadgetSkeleton } from '../GadgetCard'
import Avatar from '../Avatar'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const STALE_MS = 12 * 60 * 60 * 1000
const STATUS = {
  online: { label: 'On now', dot: 'bg-emerald-500' },
  soon: { label: 'On in 15', dot: 'bg-amber-400' },
  later: { label: 'Later', dot: 'bg-sky-500' },
}

/** "Open the Squad tab" style link used at the bottom of home cards. */
function GoTo({ tab, children, className = "mt-3" }) {
  const [, setParams] = useSearchParams()
  return (
    <button
      onClick={() => setParams({ tab }, { replace: true })}
      className={`${className} inline-flex items-center gap-1 text-xs font-medium text-gray-400 transition hover:text-gray-100`}
    >
      {children} <ArrowRight className="h-3.5 w-3.5" />
    </button>
  )
}

/** Who's on right now + the best night this week from the schedule. */
export function HomeTonight() {
  const { profileById } = useSquadData()
  const [statuses, setStatuses] = useState(null)
  const [schedule, setSchedule] = useState([])
  const [now, setNow] = useState(() => Date.now())

  const load = useCallback(async () => {
    const [s, sch] = await Promise.all([
      supabase.from('squad_status').select('user_id, status, game, updated_at'),
      supabase.from('squad_schedule').select('user_id, day_of_week, status'),
    ])
    setStatuses(s.data ?? [])
    setSchedule(sch.data ?? [])
    setNow(Date.now())
  }, [])

  useEffect(() => {
    load()
  }, [load])
  useRealtime(['squad_status', 'squad_schedule'], load)

  const active = useMemo(
    () =>
      (statuses ?? [])
        .filter((s) => STATUS[s.status] && now - new Date(s.updated_at).getTime() < STALE_MS)
        .sort((a, b) => Object.keys(STATUS).indexOf(a.status) - Object.keys(STATUS).indexOf(b.status)),
    [statuses, now],
  )

  const days = useMemo(() => {
    const today = (new Date().getDay() + 6) % 7 // 0 = Monday
    return DAY_NAMES.map((name, i) => ({
      name,
      i,
      today: i === today,
      green: schedule.filter((r) => r.day_of_week === i && r.status === 'green').length,
      maybe: schedule.filter((r) => r.day_of_week === i && r.status === 'yellow').length,
    }))
  }, [schedule])
  const best = Math.max(0, ...days.map((d) => d.green))

  return (
    <GadgetCard title="Tonight" icon={Radio}>
      {statuses === null ? (
        <GadgetSkeleton rows={3} />
      ) : (
        <>
          {active.length === 0 ? (
            <p className="text-sm text-gray-500">Nobody has checked in yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {active.map((s) => (
                <li key={s.user_id} className="flex items-center gap-2 text-sm">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS[s.status].dot}`} />
                  <Avatar profile={profileById[s.user_id]} size="xs" />
                  <span className="truncate font-medium text-gray-200">{profileById[s.user_id]?.username ?? '?'}</span>
                  <span className="truncate text-xs text-gray-500">
                    {STATUS[s.status].label}
                    {s.game ? ` · ${s.game}` : ''}
                  </span>
                  <span className="ml-auto shrink-0 text-[11px] text-gray-600">{timeAgo(s.updated_at)}</span>
                </li>
              ))}
            </ul>
          )}

          <p className="mb-1.5 mt-4 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            <CalendarCheck className="h-3.5 w-3.5" /> Free this week
          </p>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => (
              <div
                key={d.name}
                className={`rounded-lg py-1.5 text-center ring-1 ${
                  d.green > 0 && d.green === best ? 'bg-emerald-500/15 ring-emerald-400/40' : 'bg-gray-950/40 ring-white/[0.05]'
                } ${d.today ? 'outline outline-1 outline-indigo-400/60' : ''}`}
                title={`${d.green} free, ${d.maybe} maybe`}
              >
                <p className="text-[10px] text-gray-500">{d.name}</p>
                <p className={`font-display text-sm font-bold ${d.green ? 'text-emerald-300' : 'text-gray-600'}`}>{d.green}</p>
              </div>
            ))}
          </div>
          <GoTo tab="squad">Open Squad</GoTo>
        </>
      )}
    </GadgetCard>
  )
}

function SessionRow({ label, tab, children }) {
  return (
    <div className="rounded-xl bg-gray-950/40 p-3 ring-1 ring-white/[0.05]">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-300">{label}</p>
        <GoTo tab={tab} className="">View</GoTo>
      </div>
      {children}
    </div>
  )
}

/** Most recent play session in each game. */
export function HomeLastSessions() {
  const { matches: ow, loading: owLoading } = useSquadData()
  const { matches: fn, loading: fnLoading } = useFortniteData()
  const { matches: rl, loading: rlLoading } = useRocketLeagueData()

  const lastDay = (list) => {
    if (!list.length) return null
    const day = new Date(list[0].created_at).toDateString()
    return { day, matches: list.filter((m) => new Date(m.created_at).toDateString() === day) }
  }
  const owS = lastDay(ow)
  const fnS = lastDay(fn)
  const rlS = lastDay(rl)

  return (
    <GadgetCard title="Last sessions" icon={Trophy}>
      {owLoading || fnLoading || rlLoading ? (
        <GadgetSkeleton rows={2} />
      ) : (
        <div className="space-y-2">
          <SessionRow label="Overwatch" tab="overwatch">
            {owS ? (
              <p className="text-sm text-gray-400">
                <span className="text-gray-200">{owS.day}</span> ·{' '}
                <span className="font-semibold text-emerald-400">{owS.matches.filter((m) => isWin(m.result)).length}W</span>{' '}
                <span className="font-semibold text-rose-400">{owS.matches.filter((m) => !isWin(m.result)).length}L</span>
              </p>
            ) : (
              <p className="text-sm text-gray-500">No matches yet.</p>
            )}
          </SessionRow>
          <SessionRow label="Fortnite" tab="fortnite">
            {fnS ? (
              <p className="text-sm text-gray-400">
                <span className="text-gray-200">{fnS.day}</span> ·{' '}
                <span className="font-semibold text-amber-300">{fnS.matches.filter((m) => m.won).length} wins</span> in {fnS.matches.length} ·{' '}
                {fnS.matches.reduce((n, m) => n + totalKills(m), 0)} kills ({pct(fnS.matches.filter((m) => m.won).length, fnS.matches.length)}%)
              </p>
            ) : (
              <p className="text-sm text-gray-500">No games yet.</p>
            )}
          </SessionRow>
          <SessionRow label="Rocket League" tab="rocketleague">
            {rlS ? (
              <p className="text-sm text-gray-400">
                <span className="text-gray-200">{rlS.day}</span> ·{' '}
                <span className="font-semibold text-emerald-400">{rlS.matches.filter((m) => m.won).length}W</span>{' '}
                <span className="font-semibold text-rose-400">{rlS.matches.filter((m) => !m.won).length}L</span> ·{' '}
                {rlS.matches.reduce((n, m) => n + m.our_goals, 0)} goals
              </p>
            ) : (
              <p className="text-sm text-gray-500">No games yet.</p>
            )}
          </SessionRow>
        </div>
      )}
    </GadgetCard>
  )
}

/** Today's quote from the Quote Wall. */
export function HomeQuote() {
  const [quotes, setQuotes] = useState(null)
  const load = useCallback(async () => {
    const { data } = await supabase
      .from('quotes')
      .select('id, body, said_by_name, context, speaker:profiles!said_by ( username )')
      .order('created_at', { ascending: false })
    setQuotes(data ?? [])
  }, [])
  useEffect(() => {
    load()
  }, [load])
  useRealtime(['quotes'], load, 1000)

  const q = quotes?.length ? quotes[dailyIndex(quotes.length)] : null

  return (
    <GadgetCard title="Quote of the day" icon={Quote}>
      {quotes === null ? (
        <GadgetSkeleton rows={2} />
      ) : !q ? (
        <GadgetMessage>No quotes yet.</GadgetMessage>
      ) : (
        <figure>
          <blockquote className="font-display text-lg font-semibold leading-snug text-gray-50">“{q.body}”</blockquote>
          <figcaption className="mt-2 text-sm text-amber-200/90">
            — {q.speaker?.username ?? q.said_by_name ?? 'Unknown'}
            {q.context && <span className="text-gray-400">, {q.context}</span>}
          </figcaption>
        </figure>
      )}
      <GoTo tab="boards">Quote Wall</GoTo>
    </GadgetCard>
  )
}

/** Open bounties + goals that are close to done. */
export function HomeTodo() {
  const [data, setData] = useState(null)
  const load = useCallback(async () => {
    const [b, g] = await Promise.all([
      supabase
        .from('squad_bounties')
        .select('id, game, description, created_at, creator:profiles!created_by ( username )')
        .is('claimed_by', null)
        .order('created_at', { ascending: false })
        .limit(4),
      supabase.from('squad_goals').select('id, title, progress, target'),
    ])
    setData({ bounties: b.data ?? [], goals: g.data ?? [] })
  }, [])
  useEffect(() => {
    load()
  }, [load])
  useRealtime(['squad_bounties', 'squad_goals'], load)

  const goals = (data?.goals ?? [])
    .filter((g) => g.progress < g.target)
    .sort((a, b) => b.progress / b.target - a.progress / a.target)
    .slice(0, 3)

  return (
    <GadgetCard title="Up for grabs" icon={Target}>
      {!data ? (
        <GadgetSkeleton rows={3} />
      ) : (
        <>
          {data.bounties.length === 0 ? (
            <p className="text-sm text-gray-500">No open bounties.</p>
          ) : (
            <ul className="space-y-1.5">
              {data.bounties.map((b) => (
                <li key={b.id} className="truncate text-sm text-gray-300">
                  <span className="font-medium text-amber-200">{b.game}</span> · {b.description}
                  <span className="text-xs text-gray-600"> — {b.creator?.username}</span>
                </li>
              ))}
            </ul>
          )}

          {goals.length > 0 && (
            <>
              <p className="mb-1.5 mt-4 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                <Flag className="h-3.5 w-3.5" /> Goals in progress
              </p>
              <ul className="space-y-2">
                {goals.map((g) => (
                  <li key={g.id}>
                    <div className="flex justify-between text-xs">
                      <span className="truncate text-gray-300">{g.title}</span>
                      <span className="shrink-0 tabular-nums text-gray-500">
                        {g.progress}/{g.target}
                      </span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                      <div className="h-full bg-indigo-500" style={{ width: `${Math.round((g.progress / g.target) * 100)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
          <GoTo tab="boards">Open Boards</GoTo>
        </>
      )}
    </GadgetCard>
  )
}
