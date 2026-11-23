import { useCallback, useEffect, useState } from 'react'
import { CalendarClock, Pencil, Plus, Trash2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useRealtime } from '../../lib/useRealtime'
import { useAuth } from '../../context/AuthContext'
import { useSquadData } from '../../context/SquadDataContext'
import GadgetCard, { GadgetSkeleton } from '../GadgetCard'
import Avatar from '../Avatar'
import { useToast } from '../Toast'

const SELECT = 'id, title, details, starts_at, created_at, event_rsvps ( user_id, status )'
const KEEP_AFTER_MS = 24 * 60 * 60 * 1000 // stays up for 24h after it starts, then clears

const RSVP = [
  { value: 'in', label: "I'm in", on: 'bg-emerald-500/20 text-emerald-200 ring-emerald-400/50' },
  { value: 'maybe', label: 'Maybe', on: 'bg-amber-500/20 text-amber-200 ring-amber-400/50' },
  { value: 'out', label: "Can't", on: 'bg-rose-500/20 text-rose-200 ring-rose-400/50' },
]

/** Datetime-local input value (local time) for a Date. */
const toLocalInput = (d) => {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

/** Admin-set countdown to the next squad event, with RSVPs. One event at a time. */
export default function EventCountdown() {
  const { user, profile } = useAuth()
  const { profileById } = useSquadData()
  const toast = useToast()
  const isAdmin = Boolean(profile?.is_admin)
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false) // false | 'new' | 'edit'
  const now = useNow()

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('events').select(SELECT).order('created_at', { ascending: false }).limit(1)
    if (error) toast.error(error.message)
    else setEvent(data[0] ?? null)
    setLoading(false)
  }, [toast])

  useEffect(() => {
    load()
  }, [load])
  useRealtime(['events', 'event_rsvps'], load)

  const startsAt = event ? new Date(event.starts_at).getTime() : 0
  const active = event && now < startsAt + KEEP_AFTER_MS
  const myRsvp = event?.event_rsvps.find((r) => r.user_id === user.id)?.status

  async function rsvp(status) {
    const prev = event
    const others = event.event_rsvps.filter((r) => r.user_id !== user.id)
    const next = myRsvp === status ? others : [...others, { user_id: user.id, status }]
    setEvent({ ...event, event_rsvps: next }) // optimistic
    const { error } =
      myRsvp === status
        ? await supabase.from('event_rsvps').delete().match({ event_id: event.id, user_id: user.id })
        : await supabase
            .from('event_rsvps')
            .upsert({ event_id: event.id, user_id: user.id, status, updated_at: new Date().toISOString() }, { onConflict: 'event_id,user_id' })
    if (error) {
      setEvent(prev)
      toast.error(error.message)
    }
  }

  async function remove() {
    if (!window.confirm('Remove this event?')) return
    const { error } = await supabase.from('events').delete().eq('id', event.id)
    if (error) return toast.error(error.message)
    toast.success('Event removed')
    setEvent(null)
    load()
  }

  if (loading) {
    return (
      <GadgetCard title="Next event" icon={CalendarClock}>
        <GadgetSkeleton rows={2} />
      </GadgetCard>
    )
  }

  if (editing) {
    return (
      <GadgetCard
        title={editing === 'edit' ? 'Edit event' : 'Plan an event'}
        icon={CalendarClock}
        actions={
          <button className="btn-ghost p-1.5" onClick={() => setEditing(false)} title="Cancel">
            <X className="h-4 w-4" />
          </button>
        }
      >
        <EventForm
          initial={editing === 'edit' ? event : null}
          userId={user.id}
          onSaved={() => {
            toast.success(editing === 'edit' ? 'Event updated' : 'Event is live — countdown started')
            setEditing(false)
            load()
          }}
        />
      </GadgetCard>
    )
  }

  if (!active) {
    return (
      <GadgetCard
        title="Next event"
        icon={CalendarClock}
        actions={
          isAdmin && (
            <button className="btn-primary py-1.5" onClick={() => setEditing('new')}>
              <Plus className="h-4 w-4" /> Plan event
            </button>
          )
        }
      >
        <p className="py-3 text-sm text-gray-500">
          {isAdmin ? 'No event planned. Set the when and what and everyone gets a countdown.' : 'No event planned yet.'}
        </p>
      </GadgetCard>
    )
  }

  const diff = startsAt - now
  const started = diff <= 0
  const parts = [
    ['days', Math.floor(diff / 86400000)],
    ['hrs', Math.floor(diff / 3600000) % 24],
    ['min', Math.floor(diff / 60000) % 60],
    ['sec', Math.floor(diff / 1000) % 60],
  ]
  const when = new Date(event.starts_at).toLocaleString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <GadgetCard
      title="Next event"
      icon={CalendarClock}
      actions={
        isAdmin && (
          <div className="flex gap-1">
            <button className="btn-ghost p-1.5" onClick={() => setEditing('edit')} title="Edit event">
              <Pencil className="h-4 w-4" />
            </button>
            <button className="btn-ghost p-1.5" onClick={() => setEditing('new')} title="Replace with a new event">
              <Plus className="h-4 w-4" />
            </button>
            <button className="btn-ghost p-1.5 hover:text-rose-300" onClick={remove} title="Remove event">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )
      }
    >
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500/15 via-violet-500/10 to-fuchsia-500/15 p-5 ring-1 ring-white/10">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">{when}</p>
            <h3 className="mt-1 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">{event.title}</h3>
            {event.details && <p className="mt-1 text-sm text-gray-300">{event.details}</p>}
          </div>
          {started ? (
            <div className="shrink-0 rounded-xl bg-emerald-500/15 px-5 py-3 text-center ring-1 ring-emerald-400/40">
              <p className="font-display text-2xl font-bold text-emerald-200">It&apos;s on! 🎉</p>
              <p className="text-xs text-emerald-300/80">
                Started {Math.max(1, Math.round(-diff / 60000))} min ago
              </p>
            </div>
          ) : (
            <div className="flex shrink-0 gap-2">
              {parts.map(([label, v]) => (
                <div key={label} className="w-16 rounded-xl bg-gray-950/60 py-2 text-center ring-1 ring-white/10 sm:w-20">
                  <p className="font-display text-2xl font-bold tabular-nums text-white sm:text-3xl">{String(v).padStart(2, '0')}</p>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {RSVP.map((r) => (
          <button
            key={r.value}
            onClick={() => rsvp(r.value)}
            className={`para px-3 py-1.5 text-sm font-medium ring-1 transition ${
              myRsvp === r.value ? r.on : 'text-gray-300 ring-white/10 hover:bg-white/5'
            }`}
          >
            {r.label}
          </button>
        ))}
        <div className="ml-auto flex flex-wrap gap-3 text-xs">
          {RSVP.map((r) => {
            const who = event.event_rsvps.filter((x) => x.status === r.value)
            if (!who.length) return null
            return (
              <span key={r.value} className="flex items-center gap-1.5 text-gray-400">
                {r.label}
                <span className="flex -space-x-1.5">
                  {who.map((x) => (
                    <span key={x.user_id} title={profileById[x.user_id]?.username}>
                      <Avatar profile={profileById[x.user_id]} size="sm" className="ring-2 ring-gray-900" />
                    </span>
                  ))}
                </span>
              </span>
            )
          })}
        </div>
      </div>
    </GadgetCard>
  )
}

function EventForm({ initial, userId, onSaved }) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [details, setDetails] = useState(initial?.details ?? '')
  const [when, setWhen] = useState(() => {
    if (initial) return toLocalInput(new Date(initial.starts_at))
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(20, 0, 0, 0)
    return toLocalInput(d)
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!title.trim() || !when) return
    setSaving(true)
    setError('')
    const fields = { title: title.trim(), details: details.trim() || null, starts_at: new Date(when).toISOString() }
    const { error: err } = initial
      ? await supabase.from('events').update(fields).eq('id', initial.id)
      : await supabase.from('events').insert({ ...fields, created_by: userId })
    setSaving(false)
    if (err) setError(err.message)
    else onSaved()
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <input className="input" placeholder="What (e.g. Squad night: Fortnite Squads)" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} required />
        <input className="input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required />
      </div>
      <input className="input" placeholder="Details (optional): mode, Discord channel, snacks…" value={details} maxLength={200} onChange={(e) => setDetails(e.target.value)} />
      {!initial && <p className="text-xs text-gray-500">This replaces any current event. It stays up for 24 hours after it starts, then clears.</p>}
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <button type="submit" className="btn-primary w-full sm:w-auto" disabled={saving}>
        {saving ? 'Saving…' : initial ? 'Save changes' : 'Start countdown'}
      </button>
    </form>
  )
}
