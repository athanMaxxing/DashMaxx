import { useCallback, useEffect, useMemo, useState } from 'react'
import { Radio } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { clearStatus, isFresh, saveStatus, STATUS, STATUSES } from '../../lib/squadStatus'
import { timeAgo } from '../../lib/time'
import { useAuth } from '../../context/AuthContext'
import { useSquadData } from '../../context/SquadDataContext'
import Avatar from '../Avatar'
import GadgetCard, { GadgetSkeleton } from '../GadgetCard'
import { useToast } from '../Toast'

/** Live "who's on tonight" board, synced instantly via Supabase Realtime. */
export default function ReadyCheck() {
  const { user } = useAuth()
  const toast = useToast()
  const { profiles } = useSquadData()
  const [statuses, setStatuses] = useState({}) // user_id -> row
  const [game, setGame] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.from('squad_status').select('user_id, status, game, updated_at')
    if (err) setError(err.message)
    else {
      setStatuses(Object.fromEntries(data.map((r) => [r.user_id, r])))
      const mine = data.find((r) => r.user_id === user.id)
      if (mine?.game) setGame(mine.game)
    }
    setLoading(false)
  }, [user.id])

  useEffect(() => {
    load()
    const channel = supabase
      .channel('squad_status_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'squad_status' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setStatuses((prev) => {
            const next = { ...prev }
            delete next[payload.old.user_id]
            return next
          })
        } else {
          setStatuses((prev) => ({ ...prev, [payload.new.user_id]: payload.new }))
        }
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [load])

  async function setStatus(status) {
    setError('')
    const prev = statuses[user.id]
    setStatuses((s) => ({ ...s, [user.id]: { user_id: user.id, status, game: game.trim() || null, updated_at: new Date().toISOString() } })) // optimistic
    try {
      await saveStatus(user.id, status, game, toast)
    } catch (err) {
      setStatuses((s) => ({ ...s, [user.id]: prev }))
      setError(err.message)
    }
  }

  async function clearMine() {
    setError('')
    const prev = statuses[user.id]
    setStatuses((s) => ({ ...s, [user.id]: { ...prev, status: null, game: null } })) // optimistic
    setGame('')
    try {
      await clearStatus(user.id)
    } catch (err) {
      setStatuses((s) => ({ ...s, [user.id]: prev }))
      setError(err.message)
    }
  }

  const rows = useMemo(() => {
    const order = { online: 0, soon: 1, later: 2, offline: 3 }
    return profiles
      .map((p) => {
        const s = statuses[p.id]
        return { ...p, s: isFresh(s) ? s : null }
      })
      .sort((a, b) => (order[a.s?.status] ?? 9) - (order[b.s?.status] ?? 9) || a.username.localeCompare(b.username))
  }, [profiles, statuses])

  const onNow = rows.filter((r) => r.s?.status === 'online').length
  const mine = rows.find((r) => r.id === user.id)?.s

  return (
    <GadgetCard
      title="Ready Check"
      icon={Radio}
      actions={
        <span className={`para px-2 py-0.5 text-xs font-semibold ${onNow ? 'bg-green-500/15 text-green-300' : 'text-gray-500'}`}>
          {onNow} on now
        </span>
      }
    >
      <div className="mb-3 space-y-2">
        <input
          className="input"
          placeholder="Playing… (e.g. OW comp, Fortnite)"
          value={game}
          maxLength={40}
          onChange={(e) => setGame(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && mine && setStatus(mine.status)}
        />
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatus(s.value)}
              className={`btn py-1.5 text-xs ${mine?.status === s.value ? s.btn : 'border border-gray-700 text-gray-300 hover:bg-gray-800'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
        {mine && (
          <button onClick={clearMine} className="btn-ghost w-full py-1 text-xs">
            Clear my status
          </button>
        )}
      </div>

      {error && <p className="mb-2 text-sm text-red-400">{error}</p>}

      {loading && rows.length === 0 ? (
        <GadgetSkeleton />
      ) : (
        <ul className="space-y-1">
          {rows.map((r) => {
            const st = r.s ? STATUS[r.s.status] : null
            return (
              <li key={r.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-800/40">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${st ? st.dot : 'bg-gray-700'}`} />
                <span className={`min-w-0 truncate text-sm ${r.id === user.id ? 'font-semibold text-indigo-300' : 'text-gray-200'}`}>
                  <span className="inline-flex items-center gap-1.5"><Avatar profile={r} size="xs" />{r.username}</span>
                </span>
                <span className="min-w-0 flex-1 truncate text-xs text-gray-400">
                  {st ? st.label : 'No status'}
                  {r.s?.game && <span className="text-gray-500"> · {r.s.game}</span>}
                </span>
                {r.s && <span className="shrink-0 text-[11px] text-gray-600">{timeAgo(r.s.updated_at)}</span>}
              </li>
            )
          })}
        </ul>
      )}
    </GadgetCard>
  )
}
