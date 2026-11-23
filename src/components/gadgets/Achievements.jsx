import { useCallback, useEffect, useMemo, useState } from 'react'
import { Lock, Medal } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useRealtime } from '../../lib/useRealtime'
import { buildPlayerStats, evaluate } from '../../lib/achievements'
import { useAuth } from '../../context/AuthContext'
import { useSquadData } from '../../context/SquadDataContext'
import { useFortniteData } from '../../context/FortniteDataContext'
import { useRocketLeagueData } from '../../context/RocketLeagueDataContext'
import GadgetCard, { GadgetMessage, GadgetSkeleton } from '../GadgetCard'
import Avatar from '../Avatar'

const fmt = (n) => (n >= 1000 ? n.toLocaleString() : n)

/** Badges everyone unlocks automatically from what they've played and done. */
export default function Achievements() {
  const { user } = useAuth()
  const { profiles, matches: owMatches, loading: owLoading } = useSquadData()
  const { matches: fnMatches, loading: fnLoading } = useFortniteData()
  const { matches: rlMatches, loading: rlLoading } = useRocketLeagueData()
  const [extra, setExtra] = useState(null) // bounties, quotes, sprites, collection
  const [error, setError] = useState('')
  const [viewing, setViewing] = useState(user.id)

  const load = useCallback(async () => {
    const [b, q, sp, c] = await Promise.all([
      supabase.from('squad_bounties').select('claimed_by'),
      supabase.from('quotes').select('said_by, quote_likes ( user_id )'),
      supabase.from('fortnite_sprites').select('id, season, variants'),
      supabase.from('sprite_collection').select('user_id, sprite_id, variant, mastered'),
    ])
    const err = b.error || q.error || sp.error || c.error
    if (err) setError(err.message)
    else setExtra({ bounties: b.data, quotes: q.data, sprites: sp.data, collection: c.data })
  }, [])

  useEffect(() => {
    load()
  }, [load])
  useRealtime(['squad_bounties', 'quotes', 'quote_likes', 'sprite_collection', 'fortnite_sprites'], load, 1000)

  const results = useMemo(() => {
    if (!extra) return null
    const stats = buildPlayerStats({ profiles, owMatches, fnMatches, rlMatches, ...extra })
    return Object.fromEntries(profiles.map((p) => [p.id, evaluate(stats[p.id])]))
  }, [extra, profiles, owMatches, fnMatches, rlMatches])

  const ranking = useMemo(
    () =>
      results
        ? profiles
            .map((p) => ({ ...p, count: results[p.id].filter((a) => a.unlocked).length }))
            .sort((a, b) => b.count - a.count || a.username.localeCompare(b.username))
        : [],
    [results, profiles],
  )

  const mine = results?.[viewing] ?? []
  const unlocked = mine.filter((a) => a.unlocked).length
  const groups = [...new Set(mine.map((a) => a.group))]

  return (
    <GadgetCard title="Achievements" icon={Medal}>
      {error ? (
        <GadgetMessage tone="error">{error}</GadgetMessage>
      ) : !results || owLoading || fnLoading || rlLoading ? (
        <GadgetSkeleton rows={5} />
      ) : (
        <>
          {/* Squad trophy cabinet — also the player picker */}
          <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
            {ranking.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setViewing(p.id)}
                className={`flex shrink-0 items-center gap-2 para py-1 pl-1 pr-3 text-xs ring-1 transition ${
                  viewing === p.id ? 'bg-amber-500/15 text-amber-100 ring-amber-400/50' : 'text-gray-300 ring-white/10 hover:bg-white/5'
                }`}
              >
                <Avatar profile={p} size="sm" />
                <span className="max-w-[6rem] truncate font-medium">{p.username}</span>
                <span className="tabular-nums text-amber-300">
                  {i === 0 && p.count > 0 ? '👑 ' : ''}
                  {p.count}
                </span>
              </button>
            ))}
          </div>

          <div className="mb-4">
            <div className="mb-1 flex justify-between text-xs text-gray-400">
              <span>
                {unlocked} of {mine.length} unlocked
              </span>
              <span>{Math.round((unlocked / Math.max(mine.length, 1)) * 100)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all" style={{ width: `${(unlocked / Math.max(mine.length, 1)) * 100}%` }} />
            </div>
          </div>

          <div className="max-h-[30rem] space-y-4 overflow-y-auto pr-1">
            {groups.map((g) => (
              <div key={g}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{g}</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {mine
                    .filter((a) => a.group === g)
                    .sort((a, b) => b.unlocked - a.unlocked || b.pct - a.pct)
                    .map((a) => (
                      <div
                        key={a.id}
                        className={`flex items-center gap-3 rounded-xl p-2.5 ring-1 transition ${
                          a.unlocked ? 'bg-gradient-to-br from-amber-500/15 to-orange-500/5 ring-amber-400/30' : 'bg-gray-950/40 ring-white/[0.06]'
                        }`}
                        title={a.desc}
                      >
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl ${
                            a.unlocked ? 'bg-amber-400/20' : 'bg-white/[0.04] grayscale'
                          }`}
                        >
                          {a.unlocked ? a.emoji : <Lock className="h-4 w-4 text-gray-600" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm font-semibold ${a.unlocked ? 'text-amber-100' : 'text-gray-300'}`}>{a.title}</p>
                          <p className="truncate text-[11px] text-gray-500">{a.desc}</p>
                          {!a.unlocked && (
                            <div className="mt-1 flex items-center gap-2">
                              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                                <div className="h-full bg-gray-500" style={{ width: `${a.pct}%` }} />
                              </div>
                              <span className="text-[10px] tabular-nums text-gray-500">
                                {fmt(a.current)}/{fmt(a.target)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </GadgetCard>
  )
}
