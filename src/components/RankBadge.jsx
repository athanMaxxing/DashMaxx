import { rankFor, TIER_STYLE } from '../lib/rocketleague'

/** "+12" in green / "-8" in red; nothing for 0 or unknown. */
export function Delta({ value, className = '' }) {
  if (value == null || value === 0) return null
  return (
    <span className={`tabular-nums ${value > 0 ? 'text-emerald-400' : 'text-rose-400'} ${className}`}>
      {value > 0 ? '+' : ''}
      {value}
    </span>
  )
}

/** Rocket League rank pill from an MMR, e.g. "Champ I · Div 3". */
export default function RankBadge({ mmr, playlist, size = 'sm', showDivision = true }) {
  const r = rankFor(mmr, playlist)
  if (!r) return null
  const text = size === 'xs' ? r.short : r.name
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap para px-2 py-0.5 font-semibold ring-1 ${TIER_STYLE[r.tier]} ${
        size === 'lg' ? 'text-sm' : size === 'xs' ? 'text-[10px]' : 'text-xs'
      }`}
      title={`${r.name}${r.division ? ` · Division ${r.division}` : ''} (≈ from ${mmr} MMR)`}
    >
      {text}
      {showDivision && r.division && <span className="font-normal opacity-70">· Div {r.division}</span>}
    </span>
  )
}
