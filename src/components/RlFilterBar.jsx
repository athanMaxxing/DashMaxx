import { SlidersHorizontal } from 'lucide-react'
import { useRocketLeagueData } from '../context/RocketLeagueDataContext'
import { PLAYLISTS } from '../lib/rocketleague'

/** Global ranked / playlist / fill filter for every Rocket League gadget. */
export default function RlFilterBar() {
  const { filters, setFilter, clearFilters, filtersActive, filteredMatches, matches } = useRocketLeagueData()

  const select = (key, label, options) => (
    <select className="input w-auto py-1.5" value={filters[key]} onChange={(e) => setFilter(key, e.target.value)} aria-label={label}>
      {options.map(([value, text]) => (
        <option key={value} value={value}>
          {text}
        </option>
      ))}
    </select>
  )

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SlidersHorizontal className="h-4 w-4 text-gray-500" />
      {select('ranked', 'Ranked', [['', 'Ranked + casual'], ['true', 'Ranked'], ['false', 'Unranked']])}
      {select('size', 'Playlist', [['', 'All playlists'], ...PLAYLISTS.map((p) => [String(p.value), p.label])])}
      {select('fill', 'Fill', [['', 'Fill + no fill'], ['false', 'No fill'], ['true', 'Filled']])}
      {filtersActive && (
        <>
          <span className="text-xs text-gray-500">
            {filteredMatches.length} of {matches.length} games
          </span>
          <button className="text-xs text-indigo-400 hover:underline" onClick={clearFilters}>
            Clear
          </button>
        </>
      )}
    </div>
  )
}
