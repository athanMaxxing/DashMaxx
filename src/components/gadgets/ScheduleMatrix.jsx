import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import GadgetCard, { GadgetMessage } from '../GadgetCard'

/*
 * Assumed schema (edit here if your columns differ):
 *   squad_schedule (user_id -> profiles.id, day_of_week, status 'green' | 'yellow' | 'red' | null)
 *   with a UNIQUE (user_id, day_of_week) constraint for the upsert.
 *
 * `value` is what gets stored in day_of_week. Defaults to 0 = Monday … 6 = Sunday.
 * If your column stores text ('Mon', …), change the values below.
 */
const DAYS = [
  { label: 'Mon', value: 0 },
  { label: 'Tue', value: 1 },
  { label: 'Wed', value: 2 },
  { label: 'Thu', value: 3 },
  { label: 'Fri', value: 4 },
  { label: 'Sat', value: 5 },
  { label: 'Sun', value: 6 },
]

const STATUS_CLASSES = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  null: 'bg-gray-800',
}

const STATUS_LABELS = { green: 'Available', yellow: 'Maybe', red: 'Busy', null: 'Unknown' }

// Green -> Yellow -> Red -> Unknown -> Green …
const NEXT_STATUS = { green: 'yellow', yellow: 'red', red: null, null: 'green' }

export default function ScheduleMatrix() {
  const { user } = useAuth()
  const myId = user.id
  const [profiles, setProfiles] = useState([])
  const [schedule, setSchedule] = useState({}) // { [user_id]: { username, days: { [day]: status } } }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const [scheduleRes, profilesRes] = await Promise.all([
      supabase.from('squad_schedule').select('user_id, day_of_week, status, profiles ( username )'),
      // Also load all profiles so squad members without any rows still get a line.
      supabase.from('profiles').select('id, username').order('username'),
    ])
    if (scheduleRes.error || profilesRes.error) {
      setError((scheduleRes.error || profilesRes.error).message)
      setLoading(false)
      return
    }

    // Flat rows -> object grouped by user id.
    const grouped = {}
    for (const row of scheduleRes.data) {
      grouped[row.user_id] ??= { username: row.profiles?.username ?? 'Unknown', days: {} }
      grouped[row.user_id].days[row.day_of_week] = row.status ?? null
    }
    setSchedule(grouped)
    setProfiles(profilesRes.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Rows: current user first, then everyone else alphabetically.
  const rows = useMemo(() => {
    const byId = new Map(profiles.map((p) => [p.id, p.username]))
    for (const [id, entry] of Object.entries(schedule)) if (!byId.has(id)) byId.set(id, entry.username)
    return [...byId.entries()]
      .map(([id, username]) => ({ id, username, days: schedule[id]?.days ?? {} }))
      .sort((a, b) => (a.id === myId ? -1 : b.id === myId ? 1 : a.username.localeCompare(b.username)))
  }, [profiles, schedule, myId])

  const setCell = (userId, day, status) =>
    setSchedule((prev) => ({
      ...prev,
      [userId]: {
        username: prev[userId]?.username ?? '',
        days: { ...(prev[userId]?.days ?? {}), [day]: status },
      },
    }))

  async function cycle(day) {
    const current = schedule[user.id]?.days?.[day] ?? null
    const next = NEXT_STATUS[current]
    setCell(user.id, day, next) // optimistic
    const { error: err } = await supabase
      .from('squad_schedule')
      .upsert({ user_id: user.id, day_of_week: day, status: next }, { onConflict: 'user_id,day_of_week' })
    if (err) {
      setCell(user.id, day, current) // revert
      setError(err.message)
    }
  }

  return (
    <GadgetCard
      title="Scheduling Matrix"
      icon={CalendarDays}
      actions={
        <button className="btn-ghost p-1.5" onClick={load} title="Refresh" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      }
    >
      {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
      {loading && rows.length === 0 ? (
        <GadgetMessage>Loading schedule…</GadgetMessage>
      ) : rows.length === 0 ? (
        <GadgetMessage>No squad members yet.</GadgetMessage>
      ) : (
        <>
          <div className="overflow-x-auto">
            <div
              className="grid min-w-[22rem] gap-1"
              style={{ gridTemplateColumns: 'minmax(5rem, 1.5fr) repeat(7, minmax(1.75rem, 1fr))' }}
            >
              <div />
              {DAYS.map((d) => (
                <div key={d.value} className="pb-1 text-center text-xs font-medium text-gray-400">
                  {d.label}
                </div>
              ))}

              {rows.map((row) => {
                const mine = row.id === user.id
                return (
                  <div key={row.id} className="contents">
                    <div
                      className={`flex min-w-0 items-center pr-2 text-sm ${
                        mine ? 'font-semibold text-indigo-300' : 'text-gray-300'
                      }`}
                      title={mine ? `${row.username} (you)` : row.username}
                    >
                      <span className="truncate">{row.username}</span>
                    </div>
                    {DAYS.map((d) => {
                      const status = row.days[d.value] ?? null
                      const cls = `h-8 rounded ${STATUS_CLASSES[status]}`
                      const title = `${row.username} · ${d.label}: ${STATUS_LABELS[status]}`
                      return mine ? (
                        <button
                          key={d.value}
                          onClick={() => cycle(d.value)}
                          className={`${cls} ring-indigo-400 transition hover:ring-2 focus:outline-none focus-visible:ring-2`}
                          title={`${title} (click to change)`}
                          aria-label={title}
                        />
                      ) : (
                        <div key={d.value} className={cls} title={title} />
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-400">
            {['green', 'yellow', 'red', null].map((s) => (
              <span key={String(s)} className="flex items-center gap-1.5">
                <span className={`h-3 w-3 rounded-sm ${STATUS_CLASSES[s]}`} />
                {STATUS_LABELS[s]}
              </span>
            ))}
            <span className="ml-auto text-gray-500">Click your row to cycle</span>
          </div>
        </>
      )}
    </GadgetCard>
  )
}
