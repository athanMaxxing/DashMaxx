import { createContext, useContext } from 'react'

/*
 * Section accent colours. Each dashboard section provides one via <AccentContext>,
 * and every gadget card inside picks it up for its title slash and corner bar.
 * Class strings are written out in full so Tailwind keeps them.
 * `hex` is the raw colour for inline styles (charts, hero panels); `deep` is a
 * dark tint of it for hero panel backgrounds.
 */
export const ACCENTS = {
  // Brand (the logo's pink). `indigo` is remapped to it in tailwind.config.js.
  indigo: { text: 'text-indigo-300', bar: 'bg-indigo-400', soft: 'bg-indigo-400/15 text-indigo-200', hex: '#e879f9', deep: '#2b0f45' },
  emerald: { text: 'text-emerald-300', bar: 'bg-emerald-400', soft: 'bg-emerald-400/15 text-emerald-200', hex: '#4ade80', deep: '#0b3b22' },
  orange: { text: 'text-orange-300', bar: 'bg-orange-500', soft: 'bg-orange-500/15 text-orange-200', hex: '#f97316', deep: '#4a1d06' },
  yellow: { text: 'text-yellow-300', bar: 'bg-yellow-400', soft: 'bg-yellow-400/15 text-yellow-200', hex: '#facc15', deep: '#3a2f05' },
  sky: { text: 'text-sky-300', bar: 'bg-sky-400', soft: 'bg-sky-400/15 text-sky-200', hex: '#38bdf8', deep: '#0b3a5c' },
  violet: { text: 'text-violet-300', bar: 'bg-violet-400', soft: 'bg-violet-400/15 text-violet-200', hex: '#a78bfa', deep: '#2e1a5c' },
  amber: { text: 'text-amber-300', bar: 'bg-amber-400', soft: 'bg-amber-400/15 text-amber-200', hex: '#fbbf24', deep: '#3a2a05' },
  rose: { text: 'text-rose-300', bar: 'bg-rose-400', soft: 'bg-rose-400/15 text-rose-200', hex: '#fb7185', deep: '#4c0f1f' },
}

export const AccentContext = createContext('indigo')

export function useAccent() {
  return ACCENTS[useContext(AccentContext)] ?? ACCENTS.indigo
}

export default function GadgetCard({ title, icon: Icon, actions, className = '', children }) {
  const accent = useAccent()
  return (
    <section className={`card relative flex min-w-0 flex-col overflow-hidden animate-fade-up ${className}`}>
      {/* Slanted accent bar in the top-left corner. */}
      <div aria-hidden="true" className={`pointer-events-none absolute left-3 top-0 h-[3px] w-16 -skew-x-[40deg] ${accent.bar}`} />
      <header className="flex items-center justify-between gap-2 px-4 pb-3 pt-4">
        <h2 className="flex min-w-0 items-center gap-2 font-display text-[17px] font-extrabold uppercase italic tracking-wide text-gray-100">
          <span className={`not-italic ${accent.text}`} aria-hidden="true">
            //
          </span>
          {Icon && <Icon className={`h-4 w-4 shrink-0 ${accent.text}`} />}
          <span className="truncate pr-1">{title}</span>
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
        <div key={i} className="para h-9 bg-white/[0.04]" style={{ width: `${100 - (i % 3) * 12}%` }} />
      ))}
    </div>
  )
}

/** Whole-card placeholder used while a gadget's code is still downloading. */
export function CardSkeleton() {
  return (
    <div className="card animate-pulse p-4">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="para h-5 w-40 bg-white/[0.06]" />
      </div>
      <GadgetSkeleton rows={3} />
    </div>
  )
}
