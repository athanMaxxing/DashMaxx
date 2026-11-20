import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { RL_MATCH_SELECT, RL_MATCHES_CHANGED_EVENT } from '../lib/rocketleague'
import { useRealtime } from '../lib/useRealtime'

/** Shared Rocket League matches + global filters (ranked / playlist / fill). */
const RocketLeagueDataContext = createContext(null)

const EMPTY_FILTERS = { ranked: '', size: '', fill: '' }

export function RocketLeagueDataProvider({ children }) {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)

  const reload = useCallback(async (silent = false) => {
    if (silent !== true) setLoading(true)
    setError('')
    const { data, error: err } = await supabase
      .from('rl_matches')
      .select(RL_MATCH_SELECT)
      .order('created_at', { ascending: false })
    if (err) setError(err.message)
    else setMatches(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    reload()
    window.addEventListener(RL_MATCHES_CHANGED_EVENT, reload)
    return () => window.removeEventListener(RL_MATCHES_CHANGED_EVENT, reload)
  }, [reload])

  useRealtime(['rl_matches', 'rl_match_stats'], () => reload(true))

  const value = useMemo(() => {
    const filteredMatches = matches.filter(
      (m) =>
        (!filters.ranked || String(m.ranked) === filters.ranked) &&
        (!filters.size || String(m.team_size) === filters.size) &&
        (!filters.fill || String(m.fill) === filters.fill),
    )
    return {
      matches,
      filteredMatches,
      filters,
      setFilter: (key, val) => setFilters((f) => ({ ...f, [key]: val })),
      clearFilters: () => setFilters(EMPTY_FILTERS),
      filtersActive: Boolean(filters.ranked || filters.size || filters.fill),
      loading,
      error,
      reload,
    }
  }, [matches, filters, loading, error, reload])

  return <RocketLeagueDataContext.Provider value={value}>{children}</RocketLeagueDataContext.Provider>
}

export function useRocketLeagueData() {
  const ctx = useContext(RocketLeagueDataContext)
  if (!ctx) throw new Error('useRocketLeagueData must be used inside <RocketLeagueDataProvider>')
  return ctx
}
