import { useState } from 'react'

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
 * Hover / tap card for one bar. `tip` = { title, sub, color, lines: [[label, value], …] }.
 * Positioned over bar `index` of `count`, kept inside the chart's edges.
 */
function BarTip({ tip, index, count }) {
  const center = ((index + 0.5) / count) * 100
  const align = center > 70 ? '-100%' : center < 30 ? '0%' : '-50%'
  return (
    <div
      role="tooltip"
      className="card pointer-events-none absolute bottom-full z-20 mb-2 w-max min-w-[10rem] max-w-[16rem] px-3 py-2 text-xs shadow-xl"
      style={{ left: `${center}%`, transform: `translateX(${align})` }}
    >
      <p className="font-display text-sm font-extrabold uppercase italic leading-tight" style={{ color: tip.color }}>
        {tip.title}
      </p>
      {tip.sub && <p className="mb-1 text-[11px] text-gray-400">{tip.sub}</p>}
      {tip.lines?.length > 0 && (
        <dl className="mt-1 space-y-0.5">
          {tip.lines.map(([k, v], i) => (
            <div key={i} className="flex justify-between gap-4">
              <dt className="truncate text-gray-400">{k}</dt>
              <dd className="num shrink-0 font-bold text-gray-100">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}

/** Shared hover/tap/focus state for a row of bars. */
function useBarHover() {
  const [hover, setHover] = useState(null)
  const bind = (i) => ({
    onMouseEnter: () => setHover(i),
    onFocus: () => setHover(i),
    onBlur: () => setHover(null),
    onClick: () => setHover((h) => (h === i ? null : i)),
  })
  return { hover, bind, clear: () => setHover(null) }
}

const BAR_BTN = 'group relative h-full min-w-[4px] flex-1 cursor-default focus:outline-none'

/**
 * Slanted bar per game, oldest first. Each item: { key, color, win } for
 * win/loss bars (tall = win), or { key, color, value } for value bars.
 * Optional `tip` per item shows on hover/tap. `highlight` glows the last bar.
 */
export function ResultBars({ items, height = 48, label, highlight = true }) {
  const max = Math.max(1, ...items.map((i) => i.value ?? 0))
  const { hover, bind, clear } = useBarHover()
  return (
    <div className="relative" onMouseLeave={clear}>
      <div className="flex items-end gap-[3px]" style={{ height }} role="group" aria-label={label}>
        {items.map((it, i) => {
          const h = it.value != null ? Math.max(4, (it.value / max) * height) : it.win ? height : Math.round(height * 0.3)
          const last = highlight && i === items.length - 1
          const on = hover === i
          return (
            <button
              key={it.key}
              type="button"
              className={`${BAR_BTN} flex items-end`}
              aria-label={it.tip ? [it.tip.title, it.tip.sub, ...(it.tip.lines ?? []).map((l) => l.join(' '))].filter(Boolean).join(', ') : undefined}
              {...bind(i)}
            >
              <span
                className="para block w-full transition-[filter] [--cut:4px]"
                style={{
                  height: h,
                  background: it.color,
                  opacity: it.value == null && !it.win && !on ? 0.45 : 1,
                  boxShadow: last || on ? `0 0 12px ${it.color}` : undefined,
                  filter: on ? 'brightness(1.4)' : last ? 'brightness(1.25)' : undefined,
                }}
              />
            </button>
          )
        })}
      </div>
      {hover != null && items[hover]?.tip && <BarTip tip={items[hover].tip} index={hover} count={items.length} />}
    </div>
  )
}

/** Bars that go up for gains and down for losses (e.g. MMR change per game). Optional `tip` per item. */
export function DeltaBars({ items, height = 80, up = '#38bdf8', down = '#f97316', label }) {
  const max = Math.max(1, ...items.map((i) => Math.abs(i.value)))
  const half = height / 2
  const { hover, bind, clear } = useBarHover()
  return (
    <div className="relative" style={{ height }} onMouseLeave={clear}>
      <div aria-hidden="true" className="absolute inset-x-0 h-px bg-white/15" style={{ top: half }} />
      <div className="absolute inset-0 flex gap-[3px]" role="group" aria-label={label}>
        {items.map((it, i) => {
          const h = Math.max(3, (Math.abs(it.value) / max) * (half - 2))
          const gain = it.value >= 0
          const on = hover === i
          return (
            <button
              key={it.key}
              type="button"
              className={BAR_BTN}
              aria-label={it.tip ? [it.tip.title, it.tip.sub, ...(it.tip.lines ?? []).map((l) => l.join(' '))].filter(Boolean).join(', ') : undefined}
              {...bind(i)}
            >
              <span
                className="para absolute inset-x-0 [--cut:4px]"
                style={{
                  height: h,
                  top: gain ? half - h : half + 1,
                  background: gain ? up : down,
                  boxShadow: i === items.length - 1 || on ? `0 0 12px ${gain ? up : down}` : undefined,
                  filter: on ? 'brightness(1.4)' : undefined,
                }}
              />
            </button>
          )
        })}
      </div>
      {hover != null && items[hover]?.tip && <BarTip tip={items[hover].tip} index={hover} count={items.length} />}
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
