import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { FN_MATCH_SELECT, FN_MATCHES_CHANGED_EVENT } from '../lib/fortnite'
import { useRealtime } from '../lib/useRealtime'

/** Shared Fortnite matches + global Fortnite filters (mode / team size / fill / dropped together). */
const FortniteDataContext = createContext(null)

const EMPTY_FILTERS = { mode: '', size: '', fill: '', dropped: '' }

export function FortniteDataProvider({ children }) {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)

  const reload = useCallback(async (silent = false) => {
    if (silent !== true) setLoading(true)
    setError('')
    const { data, error: err } = await supabase
      .from('fn_matches')
      .select(FN_MATCH_SELECT)
      .order('created_at', { ascending: false })
    if (err) setError(err.message)
    else setMatches(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    reload()
    window.addEventListener(FN_MATCHES_CHANGED_EVENT, reload)
    return () => window.removeEventListener(FN_MATCHES_CHANGED_EVENT, reload)
  }, [reload])

  useRealtime(['fn_matches', 'fn_match_stats'], () => reload(true))

  const value = useMemo(() => {
    const modes = [...new Set(matches.map((m) => m.mode))].sort()
    const filteredMatches = matches.filter(
      (m) =>
        (!filters.mode || m.mode === filters.mode) &&
        (!filters.size || String(m.team_size) === filters.size) &&
        (!filters.fill || String(m.fill) === filters.fill) &&
        (!filters.dropped || String(m.dropped_together) === filters.dropped),
    )
    return {
      matches,
      filteredMatches,
      modes,
      lastMode: matches[0]?.mode ?? '',
      filters,
      setFilter: (key, val) => setFilters((f) => ({ ...f, [key]: val })),
      clearFilters: () => setFilters(EMPTY_FILTERS),
      filtersActive: Boolean(filters.mode || filters.size || filters.fill || filters.dropped),
      loading,
      error,
      reload,
    }
  }, [matches, filters, loading, error, reload])

  return <FortniteDataContext.Provider value={value}>{children}</FortniteDataContext.Provider>
}

export function useFortniteData() {
  const ctx = useContext(FortniteDataContext)
  if (!ctx) throw new Error('useFortniteData must be used inside <FortniteDataProvider>')
  return ctx
}
