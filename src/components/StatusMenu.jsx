import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, Settings, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../lib/useRealtime'
import { isFresh, saveStatus, STATUS, STATUSES } from '../lib/squadStatus'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'
import Avatar from './Avatar'

/**
 * The profile pill in the header. Tapping it opens a menu to set your Ready
 * Check status (On now / On in 15 / …) and what you're playing, plus a link
 * to profile settings. A dot on the avatar shows your current status.
 */
export default function StatusMenu({ onEditProfile }) {
  const { user, username, profile } = useAuth()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [mine, setMine] = useState(null)
  const [game, setGame] = useState('')
  const [saving, setSaving] = useState(false)
  const ref = useRef(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('squad_status').select('user_id, status, game, updated_at').eq('user_id', user.id).maybeSingle()
    setMine(data ?? null)
  }, [user.id])

  useEffect(() => {
    load()
  }, [load])
  useRealtime(['squad_status'], load)

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const current = isFresh(mine) ? mine : null
  const st = current ? STATUS[current.status] : null

  function toggleOpen() {
    if (!open) setGame(current?.game ?? mine?.game ?? '')
    setOpen((v) => !v)
  }

  async function pick(status) {
    const prev = mine
    setMine({ user_id: user.id, status, game: game.trim() || null, updated_at: new Date().toISOString() }) // optimistic
    setSaving(true)
    try {
      await saveStatus(user.id, status, game, toast)
      toast.success(`Status: ${STATUS[status].label}`)
      setOpen(false)
    } catch (err) {
      setMine(prev)
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        onClick={toggleOpen}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1 pl-1 pr-2.5 transition hover:border-white/20 hover:bg-white/[0.06]"
        title={st ? `${st.label}${current.game ? ` · ${current.game}` : ''}` : 'Set your status'}
      >
        <span className="relative shrink-0">
          <Avatar profile={profile ?? { username }} size="md" />
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-gray-950 ${st ? st.dot : 'bg-gray-600'}`}
            aria-hidden="true"
          />
        </span>
        <span className="max-w-[7rem] truncate text-sm font-medium text-gray-200 sm:max-w-[10rem]">{username}</span>
        {profile?.is_admin && <ShieldCheck className="h-4 w-4 shrink-0 text-rose-300" aria-label="Admin" />}
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-gray-500 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="card fixed inset-x-3 top-[calc(4.25rem+env(safe-area-inset-top))] z-40 animate-fade-up space-y-3 p-3 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-72"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold uppercase tracking-wide text-gray-400">Your status</span>
            <span className="text-gray-500">{st ? st.label : 'No status'}</span>
          </div>
          <input
            className="input"
            placeholder="Playing… (e.g. RL 2s, Fortnite)"
            value={game}
            maxLength={40}
            onChange={(e) => setGame(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && current && pick(current.status)}
          />
          <div className="grid grid-cols-2 gap-1.5">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                role="menuitemradio"
                aria-checked={current?.status === s.value}
                onClick={() => pick(s.value)}
                disabled={saving}
                className={`btn justify-start gap-2 py-2 text-xs ${
                  current?.status === s.value ? s.btn : 'border border-gray-700 text-gray-300 hover:bg-gray-800'
                }`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${current?.status === s.value ? 'bg-current' : s.dot}`} />
                {s.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-gray-500">“On now” pings the squad.</p>
          <button
            role="menuitem"
            className="btn-ghost w-full justify-center py-1.5 text-xs"
            onClick={() => {
              setOpen(false)
              onEditProfile()
            }}
          >
            <Settings className="h-3.5 w-3.5" /> Edit profile & settings
          </button>
        </div>
      )}
    </div>
  )
}
