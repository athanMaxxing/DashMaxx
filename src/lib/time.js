/** "just now", "5m ago", "3h ago", "2d ago" */
export function timeAgo(iso) {
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 45) return 'just now'
  const mins = Math.round(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

// Fired after a bounty is posted from another gadget so the Bounty Board refetches.
export const BOUNTIES_CHANGED_EVENT = 'dashmaxx:bounties-changed'

/** Same pick for everyone on a given day (e.g. "quote of the day"). */
export function dailyIndex(len) {
  const d = new Date()
  const seed = d.getFullYear() * 1000 + d.getMonth() * 40 + d.getDate()
  return len ? seed % len : 0
}
