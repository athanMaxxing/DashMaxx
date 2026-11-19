import { useEffect, useRef } from 'react'
import { supabase } from './supabase'

let channelSeq = 0

/**
 * Re-run `refetch` whenever any of `tables` changes in the database (any user).
 * Changes are debounced so a burst (e.g. a match + its 5 stat rows) triggers one refetch.
 */
export function useRealtime(tables, refetch, delay = 400) {
  const refetchRef = useRef(refetch)
  useEffect(() => {
    refetchRef.current = refetch
  })
  const key = tables.join(',')

  useEffect(() => {
    let timer
    const fire = () => {
      clearTimeout(timer)
      timer = setTimeout(() => refetchRef.current(), delay)
    }
    let channel = supabase.channel(`rt-${key}-${++channelSeq}`)
    for (const table of key.split(',')) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, fire)
    }
    channel.subscribe()
    return () => {
      clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [key, delay])
}
