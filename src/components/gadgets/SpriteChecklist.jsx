import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Sparkles, Target, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { BOUNTIES_CHANGED_EVENT } from '../../lib/time'
import { useAuth } from '../../context/AuthContext'
import { useSquadData } from '../../context/SquadDataContext'
import GadgetCard, { GadgetMessage } from '../GadgetCard'

const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']
const RARITY_STYLE = {
  common: 'text-gray-300 border-gray-600',
  uncommon: 'text-green-300 border-green-700',
  rare: 'text-sky-300 border-sky-700',
  epic: 'text-purple-300 border-purple-700',
  legendary: 'text-orange-300 border-orange-700',
  mythic: 'text-amber-200 border-amber-500',
}
const DEFAULT_VARIANTS = ['Normal', 'Cursed', 'Fortune']

/** Fortnite sprite collection tracker: shared sprite list + everyone's personal ticks. */
export default function SpriteChecklist() {
  const { user } = useAuth()
  const { profiles } = useSquadData()
  const [sprites, setSprites] = useState([])
  const [owned, setOwned] = useState([]) // { user_id, sprite_id, variant }
  const [season, setSeason] = useState('')
  const [viewing, setViewing] = useState(user.id)
  const [missingOnly, setMissingOnly] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [spritesRes, ownedRes] = await Promise.all([
      supabase.from('fortnite_sprites').select('id, name, season, rarity, variants, how_to_get, created_at'),
      supabase.from('sprite_collection').select('user_id, sprite_id, variant'),
    ])
    if (spritesRes.error || ownedRes.error) setError((spritesRes.error || ownedRes.error).message)
    else {
      setSprites(spritesRes.data)
      setOwned(ownedRes.data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Seasons, newest-added first; default to the newest.
  const seasons = useMemo(() => {
    const latest = new Map()
    for (const s of sprites) {
      const t = new Date(s.created_at).getTime()
      latest.set(s.season, Math.max(latest.get(s.season) ?? 0, t))
    }
    return [...latest.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name)
  }, [sprites])
  const activeSeason = season || seasons[0] || ''

  const seasonSprites = useMemo(
    () =>
      sprites
        .filter((s) => s.season === activeSeason)
        .sort((a, b) => RARITIES.indexOf(a.rarity) - RARITIES.indexOf(b.rarity) || a.name.localeCompare(b.name)),
    [sprites, activeSeason],
  )

  const ownedSet = useMemo(() => new Set(owned.map((o) => `${o.user_id}|${o.sprite_id}|${o.variant}`)), [owned])
  const has = (uid, spriteId, variant) => ownedSet.has(`${uid}|${spriteId}|${variant}`)

  const total = seasonSprites.reduce((n, s) => n + s.variants.length, 0)
  const progress = useMemo(
    () =>
      profiles
        .map((p) => ({
          ...p,
          count: seasonSprites.reduce(
            (n, s) => n + s.variants.filter((v) => ownedSet.has(`${p.id}|${s.id}|${v}`)).length,
            0,
          ),
        }))
        .sort((a, b) => b.count - a.count),
    [profiles, seasonSprites, ownedSet],
  )

  async function toggle(sprite, variant) {
    if (viewing !== user.id) return
    setError('')
    const row = { user_id: user.id, sprite_id: sprite.id, variant }
    if (has(user.id, sprite.id, variant)) {
      setOwned((prev) => prev.filter((o) => !(o.user_id === user.id && o.sprite_id === sprite.id && o.variant === variant)))
      const { error: err } = await supabase
        .from('sprite_collection')
        .delete()
        .match(row)
      if (err) {
        setOwned((prev) => [...prev, row])
        setError(err.message)
      }
    } else {
      setOwned((prev) => [...prev, row])
      const { error: err } = await supabase.from('sprite_collection').insert(row)
      if (err) {
        setOwned((prev) => prev.filter((o) => o !== row))
        setError(err.message)
      }
    }
  }

  async function postBounty(sprite, missing) {
    setError('')
    const what = missing.length === sprite.variants.length ? sprite.name : `${sprite.name} (${missing.join(', ')})`
    const { error: err } = await supabase
      .from('squad_bounties')
      .insert({ game: 'Fortnite', description: `Help me get the ${what} sprite`, created_by: user.id })
    if (err) setError(err.message)
    else {
      window.dispatchEvent(new Event(BOUNTIES_CHANGED_EVENT))
      setNotice(`Bounty posted for ${sprite.name}`)
      setTimeout(() => setNotice(''), 2500)
    }
  }

  const viewingName = profiles.find((p) => p.id === viewing)?.username ?? ''
  const isMe = viewing === user.id

  return (
    <GadgetCard
      title="Sprite Checklist"
      icon={Sparkles}
      actions={
        <button className="btn-ghost py-1 text-xs" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showAdd ? 'Close' : 'Add sprite'}
        </button>
      }
    >
      {showAdd && (
        <AddSpriteForm
          defaultSeason={activeSeason}
          onAdded={(s) => {
            setSprites((prev) => [...prev, s])
            setSeason(s.season)
            setShowAdd(false)
          }}
        />
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        {seasons.length > 1 && (
          <select className="input w-auto py-1 text-xs" value={activeSeason} onChange={(e) => setSeason(e.target.value)}>
            {seasons.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        )}
        <select className="input w-auto py-1 text-xs" value={viewing} onChange={(e) => setViewing(e.target.value)}>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id === user.id ? `${p.username} (you)` : p.username}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-gray-400">
          <input type="checkbox" className="accent-indigo-500" checked={missingOnly} onChange={(e) => setMissingOnly(e.target.checked)} />
          Missing only
        </label>
      </div>

      {total > 0 && (
        <div className="mb-3 space-y-1">
          {progress.map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-xs">
              <span className={`w-24 truncate ${p.id === user.id ? 'text-indigo-300' : 'text-gray-400'}`}>{p.username}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-800">
                <div
                  className={`h-full ${p.count === total ? 'bg-amber-400' : 'bg-indigo-500'}`}
                  style={{ width: `${(p.count / total) * 100}%` }}
                />
              </div>
              <span className="w-12 text-right tabular-nums text-gray-400">
                {p.count}/{total}
              </span>
            </div>
          ))}
        </div>
      )}

      {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
      {notice && <p className="mb-2 text-sm text-green-400">{notice}</p>}

      {loading ? (
        <GadgetMessage>Loading sprites…</GadgetMessage>
      ) : seasonSprites.length === 0 ? (
        <GadgetMessage>No sprites yet. Add the current season&apos;s sprites.</GadgetMessage>
      ) : (
        <ul className="max-h-[26rem] space-y-1.5 overflow-y-auto pr-1">
          {seasonSprites.map((s) => {
            const missing = s.variants.filter((v) => !has(viewing, s.id, v))
            if (missingOnly && missing.length === 0) return null
            const complete = missing.length === 0
            return (
              <li
                key={s.id}
                className={`rounded-md border-l-2 bg-gray-950/50 px-3 py-2 ${RARITY_STYLE[s.rarity] ?? RARITY_STYLE.common} ${complete ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium" title={s.how_to_get ?? ''}>
                    {s.name}
                    <span className="ml-1.5 text-[11px] font-normal capitalize text-gray-500">{s.rarity}</span>
                  </span>
                  {isMe && !complete && (
                    <button
                      className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-indigo-300"
                      onClick={() => postBounty(s, missing)}
                      title="Post a bounty on the Bounty Board"
                    >
                      <Target className="h-3 w-3" /> Bounty
                    </button>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {s.variants.map((v) => {
                    const got = has(viewing, s.id, v)
                    return (
                      <button
                        key={v}
                        onClick={() => toggle(s, v)}
                        disabled={!isMe}
                        className={`rounded-full border px-2 py-0.5 text-[11px] transition disabled:cursor-default ${
                          got
                            ? 'border-green-600 bg-green-500/20 text-green-300'
                            : 'border-gray-700 text-gray-500 enabled:hover:border-gray-500'
                        }`}
                      >
                        {got ? '✓ ' : ''}
                        {v}
                      </button>
                    )
                  })}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {!isMe && <p className="mt-2 text-[11px] text-gray-600">Viewing {viewingName}&apos;s collection (read-only).</p>}
      <p className="mt-2 text-[11px] text-gray-600">Sprite list is community-sourced; anyone can add new ones.</p>
    </GadgetCard>
  )
}

function AddSpriteForm({ defaultSeason, onAdded }) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [season, setSeason] = useState(defaultSeason)
  const [rarity, setRarity] = useState('rare')
  const [variants, setVariants] = useState(['Normal'])
  const [how, setHow] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const toggleVariant = (v) =>
    setVariants((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))

  async function submit(e) {
    e.preventDefault()
    if (!name.trim() || !season.trim() || variants.length === 0) return
    setSaving(true)
    setError('')
    const { data, error: err } = await supabase
      .from('fortnite_sprites')
      .insert({
        name: name.trim(),
        season: season.trim(),
        rarity,
        variants: DEFAULT_VARIANTS.filter((v) => variants.includes(v)),
        how_to_get: how.trim() || null,
        created_by: user.id,
      })
      .select('id, name, season, rarity, variants, how_to_get, created_at')
      .single()
    setSaving(false)
    if (err) setError(err.code === '23505' ? 'That sprite already exists for this season.' : err.message)
    else onAdded(data)
  }

  return (
    <form onSubmit={submit} className="mb-4 space-y-2 rounded-lg border border-gray-800 bg-gray-950/60 p-3">
      <div className="grid grid-cols-2 gap-2">
        <input className="input" placeholder="Sprite name" value={name} onChange={(e) => setName(e.target.value)} required />
        <select className="input capitalize" value={rarity} onChange={(e) => setRarity(e.target.value)}>
          {RARITIES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <input className="input" placeholder="Season" value={season} onChange={(e) => setSeason(e.target.value)} required />
      <input className="input" placeholder="How to get it (optional)" value={how} onChange={(e) => setHow(e.target.value)} />
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
        Variants:
        {DEFAULT_VARIANTS.map((v) => (
          <label key={v} className="flex items-center gap-1">
            <input type="checkbox" className="accent-indigo-500" checked={variants.includes(v)} onChange={() => toggleVariant(v)} />
            {v}
          </label>
        ))}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={saving}>
        {saving ? 'Adding…' : 'Add sprite'}
      </button>
    </form>
  )
}
