import { useEffect, useState } from 'react'
import { ShoppingBag } from 'lucide-react'
import GadgetCard from '../GadgetCard'

/** The Fortnite Item Shop resets every day at 00:00 UTC. */
function nextReset(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
}

const pad = (n) => String(n).padStart(2, '0')

/** Countdown to the next Fortnite Item Shop refresh, shown in your local time. */
export default function ShopTimer() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const reset = nextReset(now)
  const left = Math.max(0, Math.floor((reset - now) / 1000))
  const h = Math.floor(left / 3600)
  const m = Math.floor((left % 3600) / 60)
  const s = left % 60
  const soon = left < 15 * 60
  const at = reset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <GadgetCard title="Item Shop Refresh" icon={ShoppingBag}>
      <div className="flex flex-col items-center py-2 text-center">
        <p className={`font-display text-4xl font-bold tabular-nums tracking-tight ${soon ? 'text-amber-300' : 'text-gray-100'}`}>
          {pad(h)}:{pad(m)}:{pad(s)}
        </p>
        <p className="mt-1 text-xs text-gray-400">
          {soon ? 'Refreshing soon! ' : ''}New shop at <span className="font-semibold text-gray-200">{at}</span> your time
        </p>
      </div>
    </GadgetCard>
  )
}
