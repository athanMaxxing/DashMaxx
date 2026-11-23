/*
 * Shared "broadcast HUD" pieces: angled hero panels, slanted result bars and
 * chevron progress meters. Colours come in as hex so each game can tint them.
 */

/** Angled, striped panel used at the top of each tab. */
export function HeroPanel({ color, deep, children, flip = false, className = '' }) {
  const shape = flip
    ? 'polygon(0 0, 100% 18px, 100% 100%, 0 calc(100% - 18px))'
    : 'polygon(0 18px, 100% 0, 100% calc(100% - 18px), 0 100%)'
  return (
    <section
      className={`relative overflow-hidden px-4 py-8 sm:px-6 ${className}`}
      style={{ clipPath: shape, background: `linear-gradient(105deg, ${deep} 0%, #120f1c 55%, #0b0a12 100%)` }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: `repeating-linear-gradient(-14deg, transparent 0 22px, ${color}14 22px 23px)` }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 bottom-0 top-0 w-40 -skew-x-[18deg]"
        style={{ background: `linear-gradient(100deg, transparent, ${color}2e)` }}
      />
      <div className="relative">{children}</div>
    </section>
  )
}

/** Big slanted score like "9/4". */
export function Score({ left, right, color, size = 'text-7xl sm:text-8xl' }) {
  return (
    <span className={`inline-block -skew-x-[8deg] font-display font-extrabold italic leading-[0.8] ${size}`}>
      <span className="text-emerald-400">{left}</span>
      <span className="mx-0.5 text-[0.65em]" style={{ color }}>
        /
      </span>
      <span className="text-gray-500">{right}</span>
    </span>
  )
}

/**
 * Slanted bar per game, oldest first. Each item: { key, color, win } for
 * win/loss bars (tall = win), or { key, color, value } for value bars.
 * `highlight` glows the last bar.
 */
export function ResultBars({ items, height = 48, label, highlight = true }) {
  const max = Math.max(1, ...items.map((i) => i.value ?? 0))
  return (
    <div className="flex items-end gap-[3px]" style={{ height }} role="img" aria-label={label}>
      {items.map((it, i) => {
        const h = it.value != null ? Math.max(4, (it.value / max) * height) : it.win ? height : Math.round(height * 0.3)
        const last = highlight && i === items.length - 1
        return (
          <span
            key={it.key}
            className="para min-w-[4px] flex-1 [--cut:4px]"
            title={it.title}
            style={{
              height: h,
              background: it.color,
              opacity: it.value == null && !it.win ? 0.45 : 1,
              boxShadow: last ? `0 0 12px ${it.color}` : undefined,
              filter: last ? 'brightness(1.25)' : undefined,
            }}
          />
        )
      })}
    </div>
  )
}

/** Bars that go up for gains and down for losses (e.g. MMR change per game). */
export function DeltaBars({ items, height = 80, up = '#38bdf8', down = '#f97316', label }) {
  const max = Math.max(1, ...items.map((i) => Math.abs(i.value)))
  const half = height / 2
  return (
    <div className="relative" style={{ height }} role="img" aria-label={label}>
      <div aria-hidden="true" className="absolute inset-x-0 h-px bg-white/15" style={{ top: half }} />
      <div className="absolute inset-0 flex gap-[3px]">
        {items.map((it, i) => {
          const h = Math.max(3, (Math.abs(it.value) / max) * (half - 2))
          const gain = it.value >= 0
          return (
            <div key={it.key} className="relative min-w-[4px] flex-1" title={it.title}>
              <span
                className="para absolute inset-x-0 [--cut:4px]"
                style={{
                  height: h,
                  top: gain ? half - h : half + 1,
                  background: gain ? up : down,
                  boxShadow: i === items.length - 1 ? `0 0 12px ${gain ? up : down}` : undefined,
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Progress meter made of chevrons. `value` 0..1. */
export function Chevrons({ value, color = '#e879f9', segments = 10, height = 10, label }) {
  const filled = Math.round(Math.max(0, Math.min(1, value)) * segments)
  return (
    <div className="flex gap-0.5" role="img" aria-label={label}>
      {Array.from({ length: segments }, (_, i) => (
        <span key={i} className="chev flex-1" style={{ height, background: i < filled ? color : 'rgba(255,255,255,0.07)' }} />
      ))}
    </div>
  )
}

/** Small stat tile with a coloured top edge. */
export function StatTile({ label, value, sub, color = '#e879f9' }) {
  return (
    <div className="para bg-white/[0.04] px-3 py-2 [--cut:6px]" style={{ borderTop: `2px solid ${color}` }}>
      <p className="lbl truncate" style={{ color }}>
        {label}
      </p>
      <p className="num text-lg font-bold leading-tight text-gray-100">{value}</p>
      {sub && <p className="truncate text-[11px] text-gray-400">{sub}</p>}
    </div>
  )
}

/** Brand colours per game, used across the app. */
export const GAME_COLORS = {
  overwatch: '#f97316',
  fortnite: '#facc15',
  rocketleague: '#38bdf8',
}
