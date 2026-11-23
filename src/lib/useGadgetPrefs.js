import { useCallback, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from '../context/AuthContext'

/*
 * Per-user gadget settings, saved in the user's Supabase auth metadata so they
 * follow the account across devices:
 *   user_metadata.hidden_gadgets  ids hidden from their own tab
 *   user_metadata.home_pins       ids from other tabs pinned to Home, in display order
 */
export function useGadgetPrefs() {
  const { user } = useAuth()
  const [hidden, setHiddenState] = useState(() => new Set(user?.user_metadata?.hidden_gadgets ?? []))
  const [pins, setPinsState] = useState(() => user?.user_metadata?.home_pins ?? [])
  const [error, setError] = useState('')

  const saveHidden = useCallback(
    async (next) => {
      const prev = hidden
      setHiddenState(next) // optimistic
      setError('')
      const { error: err } = await supabase.auth.updateUser({ data: { hidden_gadgets: [...next] } })
      if (err) {
        setHiddenState(prev)
        setError(err.message)
      }
    },
    [hidden],
  )

  const savePins = useCallback(
    async (next) => {
      const prev = pins
      setPinsState(next) // optimistic
      setError('')
      const { error: err } = await supabase.auth.updateUser({ data: { home_pins: next } })
      if (err) {
        setPinsState(prev)
        setError(err.message)
      }
    },
    [pins],
  )

  /** Show or hide a list of gadget ids at once. */
  const setVisible = useCallback(
    (ids, visible) => {
      const next = new Set(hidden)
      for (const id of ids) {
        if (visible) next.delete(id)
        else next.add(id)
      }
      saveHidden(next)
    },
    [hidden, saveHidden],
  )

  /** Pin a gadget to Home (added at the end) or unpin it. */
  const togglePin = useCallback((id) => savePins(pins.includes(id) ? pins.filter((x) => x !== id) : [...pins, id]), [pins, savePins])

  /** Move a pinned gadget one place earlier (-1) or later (+1) on Home. */
  const movePin = useCallback(
    (id, dir) => {
      const i = pins.indexOf(id)
      const j = i + dir
      if (i === -1 || j < 0 || j >= pins.length) return
      const next = [...pins]
      ;[next[i], next[j]] = [next[j], next[i]]
      savePins(next)
    },
    [pins, savePins],
  )

  return { hidden, isVisible: (id) => !hidden.has(id), setVisible, pins, isPinned: (id) => pins.includes(id), togglePin, movePin, error }
}
