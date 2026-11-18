import { useCallback, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from '../context/AuthContext'

/*
 * Per-user gadget visibility, saved in the user's Supabase auth metadata
 * (user_metadata.hidden_gadgets), so it follows the account across devices.
 */
export function useGadgetPrefs() {
  const { user } = useAuth()
  const [hidden, setHiddenState] = useState(() => new Set(user?.user_metadata?.hidden_gadgets ?? []))
  const [error, setError] = useState('')

  const save = useCallback(async (next) => {
    const prev = hidden
    setHiddenState(next) // optimistic
    setError('')
    const { error: err } = await supabase.auth.updateUser({ data: { hidden_gadgets: [...next] } })
    if (err) {
      setHiddenState(prev)
      setError(err.message)
    }
  }, [hidden])

  /** Show or hide a list of gadget ids at once. */
  const setVisible = useCallback(
    (ids, visible) => {
      const next = new Set(hidden)
      for (const id of ids) {
        if (visible) next.delete(id)
        else next.add(id)
      }
      save(next)
    },
    [hidden, save],
  )

  return { hidden, isVisible: (id) => !hidden.has(id), setVisible, error }
}
