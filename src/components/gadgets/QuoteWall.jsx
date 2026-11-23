import { useCallback, useEffect, useMemo, useState } from 'react'
import { Flame, Plus, Quote, Shuffle, Trash2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useRealtime } from '../../lib/useRealtime'
import { dailyIndex, timeAgo } from '../../lib/time'
import { useAuth } from '../../context/AuthContext'
import { useSquadData } from '../../context/SquadDataContext'
import GadgetCard, { GadgetMessage, GadgetSkeleton } from '../GadgetCard'

const SELECT = `
  id, body, said_by, said_by_name, context, created_by, created_at,
  speaker:profiles!said_by ( username ),
  poster:profiles!created_by ( username ),
  quote_likes ( user_id )
`

const OTHER = '__other__'


/** Squad quotes: post the best (worst) things people said, and fire the good ones. */
export default function QuoteWall() {
  const { user, profile } = useAuth()
  const { profiles } = useSquadData()
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [sort, setSort] = useState('new') // 'new' | 'top'
  const [spotlight, setSpotlight] = useState(null) // index override for "shuffle"

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.from('quotes').select(SELECT).order('created_at', { ascending: false })
    if (err) setError(err.message)
    else setQuotes(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Live: refetch when anyone changes this data.
  useRealtime(['quotes', 'quote_likes'], load)

  const sorted = useMemo(
    () =>
      sort === 'top'
        ? [...quotes].sort((a, b) => b.quote_likes.length - a.quote_likes.length || b.created_at.localeCompare(a.created_at))
        : quotes,
    [quotes, sort],
  )

  const featured = quotes.length ? quotes[spotlight ?? dailyIndex(quotes.length)] : null

  async function toggleLike(q) {
    const liked = q.quote_likes.some((l) => l.user_id === user.id)
    const patch = (likes) => setQuotes((prev) => prev.map((x) => (x.id === q.id ? { ...x, quote_likes: likes } : x)))
    patch(liked ? q.quote_likes.filter((l) => l.user_id !== user.id) : [...q.quote_likes, { user_id: user.id }])
    const { error: err } = liked
      ? await supabase.from('quote_likes').delete().match({ quote_id: q.id, user_id: user.id })
      : await supabase.from('quote_likes').insert({ quote_id: q.id, user_id: user.id })
    if (err) {
      patch(q.quote_likes)
      setError(err.message)
    }
  }

  async function remove(q) {
    if (!window.confirm('Delete this quote?')) return
    setQuotes((prev) => prev.filter((x) => x.id !== q.id))
    const { error: err } = await supabase.from('quotes').delete().eq('id', q.id)
    if (err) {
      setError(err.message)
      load()
    }
  }

  const speakerName = (q) => q.speaker?.username ?? q.said_by_name ?? 'Unknown'

  return (
    <GadgetCard
      title="Quote Wall"
      icon={Quote}
      actions={
        <div className="flex items-center gap-1">
          <div className="flex rounded-lg bg-gray-950/70 p-0.5 text-xs ring-1 ring-white/5">
            {['new', 'top'].map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`rounded-md px-2 py-1 capitalize transition ${sort === s ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                {s}
              </button>
            ))}
          </div>
          <button className="btn-primary py-1.5" onClick={() => setShowForm((v) => !v)}>
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            <span className="hidden sm:inline">{showForm ? 'Close' : 'Add quote'}</span>
          </button>
        </div>
      }
    >
      {showForm && (
        <QuoteForm
          profiles={profiles}
          userId={user.id}
          onAdded={(q) => {
            setQuotes((prev) => [q, ...prev])
            setShowForm(false)
          }}
        />
      )}

      {error && <p className="mb-2 text-sm text-rose-400">{error}</p>}

      {featured && (
        <div className="relative mb-4 overflow-hidden rounded-xl bg-gradient-to-br from-amber-500/15 via-rose-500/10 to-fuchsia-500/10 p-5 ring-1 ring-amber-400/20">
          <Quote className="absolute -right-2 -top-2 h-20 w-20 text-white/5" />
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-300/90">
              {spotlight == null ? 'Quote of the day' : 'Random quote'}
            </span>
            <button
              className="text-gray-400 hover:text-white"
              title="Another one"
              onClick={() => setSpotlight(Math.floor(Math.random() * quotes.length))}
            >
              <Shuffle className="h-4 w-4" />
            </button>
          </div>
          <p className="font-display text-xl font-semibold leading-snug text-gray-50">“{featured.body}”</p>
          <p className="mt-2 text-sm text-amber-200/90">
            — {speakerName(featured)}
            {featured.context && <span className="text-gray-400">, {featured.context}</span>}
          </p>
        </div>
      )}

      {loading ? (
        <GadgetSkeleton />
      ) : quotes.length === 0 ? (
        <GadgetMessage>No quotes yet. Someone&apos;s bound to say something dumb tonight.</GadgetMessage>
      ) : (
        // Scroll on the outer box; columns on the inner one (columns + max-height would overflow sideways).
        <div className="max-h-[32rem] overflow-y-auto pr-1">
        <div className="columns-1 gap-3 sm:columns-2 2xl:columns-3">
          {sorted.map((q) => {
            const liked = q.quote_likes.some((l) => l.user_id === user.id)
            const canDelete = q.created_by === user.id || profile?.is_admin
            return (
              <figure
                key={q.id}
                className="group mb-3 break-inside-avoid rounded-xl border border-white/[0.06] bg-gray-950/50 p-4 transition hover:border-white/15"
              >
                <blockquote className="text-[15px] leading-relaxed text-gray-100">“{q.body}”</blockquote>
                <figcaption className="mt-2 text-sm">
                  <span className="font-semibold text-amber-200">— {speakerName(q)}</span>
                  {q.context && <span className="text-gray-400">, {q.context}</span>}
                </figcaption>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-500">
                  <span className="truncate">
                    added by {q.poster?.username ?? 'someone'} · {timeAgo(q.created_at)}
                  </span>
                  <span className="ml-auto flex items-center gap-1">
                    {canDelete && (
                      <button
                        onClick={() => remove(q)}
                        className="rounded p-1 text-gray-600 opacity-0 transition hover:text-rose-400 focus:opacity-100 group-hover:opacity-100"
                        title="Delete quote"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => toggleLike(q)}
                      className={`flex items-center gap-1 para px-2 py-0.5 ring-1 transition ${
                        liked ? 'bg-orange-500/20 text-orange-300 ring-orange-400/40' : 'text-gray-400 ring-white/10 hover:text-orange-300'
                      }`}
                      title={liked ? 'Un-fire' : 'Fire'}
                    >
                      <Flame className="h-3.5 w-3.5" />
                      {q.quote_likes.length}
                    </button>
                  </span>
                </div>
              </figure>
            )
          })}
        </div>
        </div>
      )}
    </GadgetCard>
  )
}

function QuoteForm({ profiles, userId, onAdded }) {
  const [body, setBody] = useState('')
  const [who, setWho] = useState('')
  const [otherName, setOtherName] = useState('')
  const [context, setContext] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!body.trim() || !who || (who === OTHER && !otherName.trim())) return
    setSaving(true)
    setError('')
    const { data, error: err } = await supabase
      .from('quotes')
      .insert({
        body: body.trim(),
        said_by: who === OTHER ? null : who,
        said_by_name: who === OTHER ? otherName.trim() : null,
        context: context.trim() || null,
        created_by: userId,
      })
      .select(SELECT)
      .single()
    setSaving(false)
    if (err) setError(err.message)
    else onAdded(data)
  }

  return (
    <form onSubmit={submit} className="mb-4 space-y-2 rounded-xl border border-white/[0.06] bg-gray-950/60 p-3">
      <textarea
        className="input min-h-[4.5rem] resize-y"
        placeholder="“I'm not tilted, the game is just broken”"
        value={body}
        maxLength={300}
        onChange={(e) => setBody(e.target.value)}
        required
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <select className="input" value={who} onChange={(e) => setWho(e.target.value)} required>
          <option value="">Who said it…</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.username}
            </option>
          ))}
          <option value={OTHER}>Someone else…</option>
        </select>
        {who === OTHER ? (
          <input className="input" placeholder="Their name" value={otherName} maxLength={40} onChange={(e) => setOtherName(e.target.value)} required />
        ) : (
          <input className="input" placeholder="Context (optional)" value={context} maxLength={120} onChange={(e) => setContext(e.target.value)} />
        )}
      </div>
      {who === OTHER && (
        <input className="input" placeholder="Context (optional)" value={context} maxLength={120} onChange={(e) => setContext(e.target.value)} />
      )}
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={saving}>
        {saving ? 'Posting…' : 'Post quote'}
      </button>
    </form>
  )
}
