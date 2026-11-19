import { SlidersHorizontal } from 'lucide-react'
import { useFortniteData } from '../context/FortniteDataContext'
import { TEAM_SIZES } from '../lib/fortnite'

/** Global mode / fill / dropped-together filter for every Fortnite stats gadget. */
export default function FnFilterBar() {
  const { filters, setFilter, clearFilters, filtersActive, modes, filteredMatches, matches } = useFortniteData()

  const select = (key, label, options) => (
    <select
      className="input w-auto py-1.5"
      value={filters[key]}
      onChange={(e) => setFilter(key, e.target.value)}
      aria-label={label}
    >
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
      {select('mode', 'Mode', [['', 'All modes'], ...modes.map((m) => [m, m])])}
      {select('size', 'Team size', [['', 'All sizes'], ...TEAM_SIZES.map((t) => [String(t.value), t.label])])}
      {select('fill', 'Fill', [['', 'Fill + no fill'], ['false', 'No fill'], ['true', 'Filled']])}
      {select('dropped', 'Drop', [['', 'Any drop'], ['true', 'Dropped together'], ['false', 'Split drop']])}
      {filtersActive && (
        <>
          <span className="text-xs text-gray-500">
            {filteredMatches.length} of {matches.length} matches
          </span>
          <button className="text-xs text-indigo-400 hover:underline" onClick={clearFilters}>
            Clear
          </button>
        </>
      )}
    </div>
  )
}
