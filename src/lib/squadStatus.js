import { supabase } from './supabase'
import { notifySquadOnline } from './push'

/* "Who's on tonight" statuses, stored one row per user in squad_status. */
export const STATUSES = [
  { value: 'online', label: 'On now', dot: 'bg-green-500', btn: 'bg-green-600 text-white' },
  { value: 'soon', label: 'On in 15', dot: 'bg-yellow-500', btn: 'bg-yellow-500 text-gray-950' },
  { value: 'later', label: 'Later tonight', dot: 'bg-sky-500', btn: 'bg-sky-600 text-white' },
  { value: 'offline', label: 'Not tonight', dot: 'bg-red-500', btn: 'bg-red-600 text-white' },
]
export const STATUS = Object.fromEntries(STATUSES.map((s) => [s.value, s]))
export const STALE_MS = 12 * 60 * 60 * 1000 // statuses older than 12h count as "no status"

export const isFresh = (row) => Boolean(row?.status) && Date.now() - new Date(row.updated_at).getTime() < STALE_MS

/** Back to "No status" (e.g. after a session). Keeps the row so the ping cooldown sticks. */
export async function clearStatus(userId) {
  const row = { user_id: userId, status: null, game: null, updated_at: new Date().toISOString() }
  const { error } = await supabase.from('squad_status').upsert(row, { onConflict: 'user_id' })
  if (error) throw error
  return row
}

/**
 * Save the user's status. Setting "On now" also pushes a ping to the squad
 * (the server applies a 20-min cooldown); `toast` reports how that went.
 * Returns the saved row, or throws.
 */
export async function saveStatus(userId, status, game, toast) {
  const row = { user_id: userId, status, game: game?.trim() || null, updated_at: new Date().toISOString() }
  const { error } = await supabase.from('squad_status').upsert(row, { onConflict: 'user_id' })
  if (error) throw error
  if (status === 'online') {
    notifySquadOnline()
      .then((r) => {
        if (r?.sent > 0) toast?.info(`Pinged ${r.sent} squad device${r.sent === 1 ? '' : 's'} 🔔`)
        else if (r?.reason === 'cooldown') toast?.info(`Squad was pinged recently. Next ping in ${r.minutesLeft} min.`)
      })
      .catch(() => {})
  }
  return row
}
