import { createContext, useContext } from 'react'

/*
 * Section accent colours. Each dashboard section provides one via <AccentContext>,
 * and every gadget card inside picks it up for its icon chip and top glow line.
 * Class strings are written out in full so Tailwind keeps them.
 */
export const ACCENTS = {
  indigo: {
    chip: 'bg-indigo-500/15 text-indigo-300 ring-indigo-400/30',
    line: 'from-indigo-500/0 via-indigo-400/70 to-indigo-500/0',
    text: 'text-indigo-300',
    tab: 'bg-indigo-500/15 text-indigo-200 ring-indigo-400/40',
    title: 'from-indigo-200 to-indigo-400',
  },
  emerald: {
    chip: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30',
    line: 'from-emerald-500/0 via-emerald-400/70 to-emerald-500/0',
    text: 'text-emerald-300',
    tab: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/40',
    title: 'from-emerald-200 to-teal-400',
  },
  orange: {
    chip: 'bg-orange-500/15 text-orange-300 ring-orange-400/30',
    line: 'from-orange-500/0 via-orange-400/70 to-orange-500/0',
    text: 'text-orange-300',
    tab: 'bg-orange-500/15 text-orange-200 ring-orange-400/40',
    title: 'from-amber-200 to-orange-400',
  },
  violet: {
    chip: 'bg-violet-500/15 text-violet-300 ring-violet-400/30',
    line: 'from-violet-500/0 via-fuchsia-400/70 to-violet-500/0',
    text: 'text-violet-300',
    tab: 'bg-violet-500/15 text-violet-200 ring-violet-400/40',
    title: 'from-sky-300 to-fuchsia-400',
  },
  amber: {
    chip: 'bg-amber-500/15 text-amber-300 ring-amber-400/30',
    line: 'from-amber-500/0 via-amber-300/70 to-amber-500/0',
    text: 'text-amber-300',
    tab: 'bg-amber-500/15 text-amber-200 ring-amber-400/40',
    title: 'from-yellow-200 to-amber-400',
  },
  rose: {
    chip: 'bg-rose-500/15 text-rose-300 ring-rose-400/30',
    line: 'from-rose-500/0 via-rose-400/70 to-rose-500/0',
    text: 'text-rose-300',
    tab: 'bg-rose-500/15 text-rose-200 ring-rose-400/40',
    title: 'from-rose-200 to-rose-400',
  },
}

export const AccentContext = createContext('indigo')

export function useAccent() {
  return ACCENTS[useContext(AccentContext)] ?? ACCENTS.indigo
}

export default function GadgetCard({ title, icon: Icon, actions, className = '', children }) {
  const accent = useAccent()
  return (
    <section className={`card relative flex min-w-0 flex-col overflow-hidden animate-fade-up ${className}`}>
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${accent.line}`} />
      <header className="flex items-center justify-between gap-2 px-4 pb-3 pt-4">
        <h2 className="flex min-w-0 items-center gap-2.5 text-[15px] font-semibold tracking-tight text-gray-100">
          {Icon && (
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ${accent.chip}`}>
              <Icon className="h-4 w-4" />
            </span>
          )}
          <span className="truncate">{title}</span>
        </h2>
        {actions}
      </header>
      <div className="flex-1 px-4 pb-4">{children}</div>
    </section>
  )
}

export function GadgetMessage({ children, tone = 'muted' }) {
  const color = tone === 'error' ? 'text-rose-400' : 'text-gray-500'
  return <p className={`py-8 text-center text-sm ${color}`}>{children}</p>
}

/** Shimmering placeholder rows while a gadget loads. */
export function GadgetSkeleton({ rows = 4 }) {
  return (
    <div className="animate-pulse space-y-2.5 py-2" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-9 rounded-lg bg-white/[0.04]" style={{ width: `${100 - (i % 3) * 12}%` }} />
      ))}
    </div>
  )
}

/** Whole-card placeholder used while a gadget's code is still downloading. */
export function CardSkeleton() {
  return (
    <div className="card animate-pulse p-4">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="h-7 w-7 rounded-lg bg-white/[0.06]" />
        <div className="h-4 w-32 rounded bg-white/[0.06]" />
      </div>
      <GadgetSkeleton rows={3} />
    </div>
  )
}
