import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronDown, Settings, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Avatar from './Avatar'
import { StatusPicker, useMyStatus } from './StatusPicker'

/**
 * The profile button in the header. Tapping it opens a menu to set your Ready
 * Check status and what you're playing, plus a link to the Me tab. A slanted
 * tag on the avatar shows your current status.
 */
export default function StatusMenu() {
  const { username, profile } = useAuth()
  const [, setParams] = useSearchParams()
  const my = useMyStatus()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

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

  const st = my.status

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="para flex min-h-[44px] min-w-0 items-center gap-2 bg-white/[0.05] py-1 pl-3 pr-4 transition hover:bg-white/[0.1]"
        title={st ? `${st.label}${my.current.game ? ` · ${my.current.game}` : ''}` : 'Set your status'}
      >
        <Avatar profile={profile ?? { username }} size="md" />
        <span className="flex min-w-0 flex-col items-start leading-tight">
          <span className="max-w-[7rem] truncate font-display text-sm font-bold uppercase tracking-wide text-gray-100 sm:max-w-[10rem]">{username}</span>
          <span className="flex items-center gap-1 text-[11px] text-gray-400">
            <span className={`h-2 w-2 -skew-x-12 ${st ? st.dot : 'bg-gray-600'}`} aria-hidden="true" />
            {st ? st.label : 'Set status'}
          </span>
        </span>
        {profile?.is_admin && <ShieldCheck className="h-4 w-4 shrink-0 text-rose-300" aria-label="Admin" />}
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-gray-500 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="card fixed inset-x-3 top-[calc(4.25rem+env(safe-area-inset-top))] z-40 animate-fade-up space-y-3 p-3 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80"
        >
          <div className="flex items-center justify-between">
            <span className="lbl">
              <span className="text-indigo-400">//</span> Your status
            </span>
            <span className="text-xs text-gray-400">{st ? st.label : 'No status'}</span>
          </div>
          <StatusPicker my={my} onPicked={() => setOpen(false)} />
          <button
            role="menuitem"
            className="btn-ghost w-full py-1.5 text-xs"
            onClick={() => {
              setOpen(false)
              setParams({ tab: 'me' }, { replace: true })
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          >
            <Settings className="h-3.5 w-3.5" /> Profile &amp; settings
          </button>
        </div>
      )}
    </div>
  )
}
