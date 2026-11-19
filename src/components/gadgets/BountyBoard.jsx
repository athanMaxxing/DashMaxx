import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Crosshair, Plus, RefreshCw, Target } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useRealtime } from '../../lib/useRealtime'
import { BOUNTIES_CHANGED_EVENT } from '../../lib/time'
import { useAuth } from '../../context/AuthContext'
import GadgetCard, { GadgetMessage, GadgetSkeleton } from '../GadgetCard'

/*
 * Assumed schema (edit here if your columns differ):
 *   squad_bounties (id, game text, description text,
 *                   created_by -> profiles.id, claimed_by -> profiles.id (nullable), created_at)
 */
const BOUNTY_SELECT = `
  id, game, description, created_at, created_by, claimed_by,
  creator:profiles!created_by ( username ),
  claimer:profiles!claimed_by ( username )
`

export default function BountyBoard() {
  const { user, username } = useAuth()
  const [bounties, setBounties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [game, setGame] = useState('')
  const [description, setDescription] = useState('')
  const [posting, setPosting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error: err } = await supabase
      .from('squad_bounties')
      .select(BOUNTY_SELECT)
      .order('created_at', { ascending: false })
    if (err) setError(err.message)
    else setBounties(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    window.addEventListener(BOUNTIES_CHANGED_EVENT, load)
    return () => window.removeEventListener(BOUNTIES_CHANGED_EVENT, load)
  }, [load])

  // Live: refetch when anyone changes this data.
  useRealtime(['squad_bounties'], load)

  const { open, claimed } = useMemo(
    () => ({
      open: bounties.filter((b) => !b.claimed_by),
      claimed: bounties.filter((b) => b.claimed_by),
    }),
    [bounties],
  )

  async function handlePost(e) {
    e.preventDefault()
    if (!game.trim() || !description.trim()) return
    setPosting(true)
    setError('')
    const { data, error: err } = await supabase
      .from('squad_bounties')
      .insert({ game: game.trim(), description: description.trim(), created_by: user.id })
      .select(BOUNTY_SELECT)
      .single()
    if (err) setError(err.message)
    else {
      setBounties((prev) => [data, ...prev])
      setGame('')
      setDescription('')
    }
    setPosting(false)
  }

  async function handleClaim(bounty) {
    setError('')
    // Optimistic: move it to "claimed" immediately.
    setBounties((prev) =>
      prev.map((b) => (b.id === bounty.id ? { ...b, claimed_by: user.id, claimer: { username } } : b)),
    )
    const { data, error: err } = await supabase
      .from('squad_bounties')
      .update({ claimed_by: user.id })
      .eq('id', bounty.id)
      .is('claimed_by', null) // don't steal a bounty someone else just claimed
      .select('id')

    if (err || !data?.length) {
      setBounties((prev) => prev.map((b) => (b.id === bounty.id ? bounty : b))) // revert
      setError(err?.message ?? 'Could not claim — it may already be taken. Refreshing…')
      if (!err) load()
    }
  }

  return (
    <GadgetCard
      title="Squad Bounty Board"
      icon={Target}
      actions={
        <button className="btn-ghost p-1.5" onClick={load} title="Refresh" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      }
    >
      <form onSubmit={handlePost} className="mb-4 space-y-2">
        <input
          className="input"
          placeholder="Game (e.g. Overwatch 2)"
          value={game}
          onChange={(e) => setGame(e.target.value)}
          required
        />
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Bounty (e.g. Carry me to Diamond)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary shrink-0" disabled={posting}>
            <Plus className="h-4 w-4" /> Post
          </button>
        </div>
      </form>

      {error && <p className="mb-2 text-sm text-red-400">{error}</p>}

      {loading && bounties.length === 0 ? (
        <GadgetSkeleton />
      ) : bounties.length === 0 ? (
        <GadgetMessage>No bounties yet. Post the first one.</GadgetMessage>
      ) : (
        <div className="max-h-[28rem] space-y-4 overflow-y-auto pr-1">
          <BountySection title={`Open (${open.length})`}>
            {open.length === 0 ? (
              <p className="text-xs text-gray-500">All bounties claimed.</p>
            ) : (
              open.map((b) => (
                <BountyItem key={b.id} bounty={b}>
                  <button className="btn-primary shrink-0 py-1 text-xs" onClick={() => handleClaim(b)}>
                    <Crosshair className="h-3.5 w-3.5" /> Claim
                  </button>
                </BountyItem>
              ))
            )}
          </BountySection>

          {claimed.length > 0 && (
            <BountySection title={`Claimed (${claimed.length})`}>
              {claimed.map((b) => (
                <BountyItem key={b.id} bounty={b} done>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-green-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {b.claimer?.username ?? 'someone'}
                  </span>
                </BountyItem>
              ))}
            </BountySection>
          )}
        </div>
      )}
    </GadgetCard>
  )
}

function BountySection({ title, children }) {
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-400">{title}</h3>
      <ul className="space-y-1.5">{children}</ul>
    </div>
  )
}

function BountyItem({ bounty, done = false, children }) {
  return (
    <li
      className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${
        done ? 'border-gray-800/60 bg-gray-950/30 opacity-60' : 'border-gray-800 bg-gray-950/50'
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${done ? 'text-gray-400 line-through' : 'text-gray-100'}`}>{bounty.description}</p>
        <p className="mt-0.5 text-xs text-gray-500">
          <span className="font-medium text-indigo-300/80">{bounty.game}</span> · posted by{' '}
          {bounty.creator?.username ?? 'unknown'}
        </p>
      </div>
      {children}
    </li>
  )
}
