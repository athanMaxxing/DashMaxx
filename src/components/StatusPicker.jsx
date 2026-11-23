import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../lib/useRealtime'
import { isFresh, saveStatus, STATUS, STATUSES } from '../lib/squadStatus'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'

/** The signed-in user's Ready Check row, kept live, plus a setter. */
export function useMyStatus() {
  const { user } = useAuth()
  const toast = useToast()
  const [mine, setMine] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('squad_status').select('user_id, status, game, updated_at').eq('user_id', user.id).maybeSingle()
    setMine(data ?? null)
  }, [user.id])

  useEffect(() => {
    load()
  }, [load])
  useRealtime(['squad_status'], load)

  const set = useCallback(
    async (status, game) => {
      const prev = mine
      setMine({ user_id: user.id, status, game: game?.trim() || null, updated_at: new Date().toISOString() }) // optimistic
      setSaving(true)
      try {
        await saveStatus(user.id, status, game, toast)
        toast.success(`Status: ${STATUS[status].label}`)
        return true
      } catch (err) {
        setMine(prev)
        toast.error(err.message)
        return false
      } finally {
        setSaving(false)
      }
    },
    [mine, user.id, toast],
  )

  const current = isFresh(mine) ? mine : null
  return { mine, current, status: current ? STATUS[current.status] : null, set, saving }
}

/** The 4 status buttons and the "Playing…" box. */
export function StatusPicker({ my, onPicked }) {
  const { current, mine, set, saving } = my
  const [game, setGame] = useState(() => current?.game ?? mine?.game ?? '')

  async function pick(status) {
    if ((await set(status, game)) && onPicked) onPicked()
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {STATUSES.map((s) => {
          const on = current?.status === s.value
          return (
            <button
              key={s.value}
              aria-pressed={on}
              onClick={() => pick(s.value)}
              disabled={saving}
              className={`btn justify-start gap-2 py-2 text-xs ${on ? s.btn : 'bg-white/[0.05] text-gray-300 hover:bg-white/[0.1]'}`}
            >
              <span className={`h-2 w-2 shrink-0 -skew-x-12 ${on ? 'bg-current' : s.dot}`} />
              {s.label}
            </button>
          )
        })}
      </div>
      <label className="flex items-center gap-2 border border-white/10 bg-gray-950/60 px-3">
        <span className="lbl shrink-0 tracking-[0.1em]">Playing</span>
        <input
          className="min-w-0 flex-1 bg-transparent py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none"
          placeholder="e.g. RL 2s, Fortnite"
          value={game}
          maxLength={40}
          onChange={(e) => setGame(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && current && pick(current.status)}
        />
      </label>
      <p className="text-[11px] text-gray-500">“On now” pings the squad.</p>
    </div>
  )
}
