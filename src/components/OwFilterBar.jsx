import { SlidersHorizontal } from 'lucide-react'
import { useSquadData } from '../context/SquadDataContext'
import { MODES, QUEUES } from '../lib/overwatch'

/** Global season / mode / queue filter for every Overwatch gadget. */
export default function OwFilterBar() {
  const { filters, setFilter, clearFilters, filtersActive, seasons, filteredMatches, matches } = useSquadData()

  const select = (key, label, options) => (
    <select
      className="input w-auto py-1.5"
      value={filters[key]}
      onChange={(e) => setFilter(key, e.target.value)}
      aria-label={label}
    >
      <option value="">All {label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SlidersHorizontal className="h-4 w-4 text-gray-500" />
      {select('season', 'seasons', seasons.map((s) => ({ value: s, label: s })))}
      {select('mode', 'modes', MODES)}
      {select('queue', 'queues', QUEUES)}
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
