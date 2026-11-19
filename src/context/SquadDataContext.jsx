import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { MATCH_SELECT, MATCHES_CHANGED_EVENT } from '../lib/overwatch'
import { useRealtime } from '../lib/useRealtime'

/*
 * One shared fetch of squad profiles + Overwatch matches for every gadget on the dashboard,
 * plus the global Overwatch filters (season / mode / queue).
 */
const SquadDataContext = createContext(null)

const EMPTY_FILTERS = { season: '', mode: '', queue: '' }

export function SquadDataProvider({ children }) {
  const [profiles, setProfiles] = useState([])
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)

  // `silent` = background refresh (realtime) without flashing loading states.
  const reload = useCallback(async (silent = false) => {
    if (silent !== true) setLoading(true)
    setError('')
    const [profilesRes, matchesRes] = await Promise.all([
      supabase.from('profiles').select('id, username, avatar_emoji, avatar_color').order('username'),
      supabase.from('ow_matches').select(MATCH_SELECT).order('created_at', { ascending: false }),
    ])
    if (profilesRes.error || matchesRes.error) {
      setError((profilesRes.error || matchesRes.error).message)
    } else {
      setProfiles(profilesRes.data)
      setMatches(matchesRes.data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    reload()
    window.addEventListener(MATCHES_CHANGED_EVENT, reload)
    return () => window.removeEventListener(MATCHES_CHANGED_EVENT, reload)
  }, [reload])

  useRealtime(['profiles', 'ow_matches', 'ow_match_stats'], () => reload(true))

  const value = useMemo(() => {
    const seasons = [...new Set(matches.map((m) => m.season).filter(Boolean))].sort((a, b) =>
      b.localeCompare(a, undefined, { numeric: true }),
    )
    const filteredMatches = matches.filter(
      (m) =>
        (!filters.season || m.season === filters.season) &&
        (!filters.mode || m.mode === filters.mode) &&
        (!filters.queue || m.queue === filters.queue),
    )
    const usernames = Object.fromEntries(profiles.map((p) => [p.id, p.username]))
    const profileById = Object.fromEntries(profiles.map((p) => [p.id, p]))
    return {
      profiles,
      usernames,
      profileById,
      matches,
      filteredMatches,
      seasons,
      latestSeason: matches.find((m) => m.season)?.season ?? '',
      filters,
      setFilter: (key, val) => setFilters((f) => ({ ...f, [key]: val })),
      clearFilters: () => setFilters(EMPTY_FILTERS),
      filtersActive: Boolean(filters.season || filters.mode || filters.queue),
      loading,
      error,
      reload,
    }
  }, [profiles, matches, filters, loading, error, reload])

  return <SquadDataContext.Provider value={value}>{children}</SquadDataContext.Provider>
}

export function useSquadData() {
  const ctx = useContext(SquadDataContext)
  if (!ctx) throw new Error('useSquadData must be used inside <SquadDataProvider>')
  return ctx
}
