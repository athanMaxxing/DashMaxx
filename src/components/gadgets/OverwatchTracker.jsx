import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Filter, Plus, RefreshCw, Swords, Trash2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useSquadData } from '../../context/SquadDataContext'
import GadgetCard, { GadgetMessage } from '../GadgetCard'
import PlayerPicker from '../PlayerPicker'
import {
  DEFAULT_SEASON,
  isWin,
  MATCHES_CHANGED_EVENT,
  MODES,
  modeForMap,
  modeLabel,
  OW_HEROES,
  OW_MAPS,
  playedTogether,
  QUEUES,
  queueLabel,
  STAT_FIELDS,
} from '../../lib/overwatch'

const emptyPlayer = (playerId = '') => ({
  player_id: playerId,
  hero: '',
  ...Object.fromEntries(STAT_FIELDS.map((f) => [f.key, ''])),
})

export default function OverwatchTracker() {
  const { user } = useAuth()
  const { profiles, matches, filteredMatches, latestSeason, filtersActive, loading, error, reload } =
    useSquadData()

  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [compFilter, setCompFilter] = useState([]) // profile ids that must ALL be present

  const shown = useMemo(() => playedTogether(filteredMatches, compFilter), [filteredMatches, compFilter])

  const record = useMemo(() => {
    const wins = shown.filter((m) => isWin(m.result)).length
    return { wins, losses: shown.length - wins }
  }, [shown])

  return (
    <GadgetCard
      title="Overwatch Squad Tracker"
      icon={Swords}
      actions={
        <div className="flex gap-1">
          <button className="btn-ghost p-1.5" onClick={reload} title="Refresh" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button className="btn-primary py-1.5" onClick={() => setShowForm((v) => !v)}>
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Close' : 'Log match'}
          </button>
        </div>
      }
    >
      {showForm && (
        <MatchForm
          profiles={profiles}
          currentUserId={user.id}
          defaultSeason={latestSeason || DEFAULT_SEASON}
          lastQueue={matches[0]?.queue ?? 'competitive'}
          onSaved={() => {
            setShowForm(false)
            window.dispatchEvent(new Event(MATCHES_CHANGED_EVENT))
          }}
        />
      )}

      <PlayerPicker
        profiles={profiles}
        selected={compFilter}
        onChange={setCompFilter}
        label="Composition filter"
        icon={Filter}
      />

      {!loading && !error && shown.length > 0 && (
        <p className="mb-2 text-xs text-gray-400">
          {shown.length} match{shown.length === 1 ? '' : 'es'} ·{' '}
          <span className="text-green-400">{record.wins}W</span> /{' '}
          <span className="text-red-400">{record.losses}L</span> ·{' '}
          {Math.round((record.wins / shown.length) * 100)}% win rate
        </p>
      )}

      {error ? (
        <GadgetMessage tone="error">{error}</GadgetMessage>
      ) : loading && matches.length === 0 ? (
        <GadgetMessage>Loading matches…</GadgetMessage>
      ) : shown.length === 0 ? (
        <GadgetMessage>
          {compFilter.length
            ? 'No matches with that exact squad together.'
            : filtersActive
              ? 'No matches for these filters.'
              : 'No matches logged yet.'}
        </GadgetMessage>
      ) : (
        <ul className="max-h-[28rem] space-y-1.5 overflow-y-auto pr-1">
          {shown.slice(0, 100).map((m) => (
            <MatchRow
              key={m.id}
              match={m}
              expanded={expandedId === m.id}
              onToggle={() => setExpandedId((cur) => (cur === m.id ? null : m.id))}
            />
          ))}
        </ul>
      )}
    </GadgetCard>
  )
}


function MatchRow({ match, expanded, onToggle }) {
  const win = isWin(match.result)
  const Chevron = expanded ? ChevronDown : ChevronRight
  return (
    <li className="overflow-hidden rounded-lg border border-gray-800 bg-gray-950/50">
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-800/50">
        <Chevron className="h-4 w-4 shrink-0 text-gray-500" />
        <span
          className={`w-10 shrink-0 rounded px-1.5 py-0.5 text-center text-xs font-bold ${
            win ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}
        >
          {win ? 'WIN' : 'LOSS'}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {match.map}
          <span className="ml-2 text-xs font-normal text-gray-500">
            {modeLabel(match.mode)}
            {match.queue === 'quickplay' && ' · QP'}
          </span>
        </span>
        <span className="shrink-0 text-xs text-gray-500" title={`${match.season ?? ''} · ${queueLabel(match.queue)}`}>
          {match.ow_match_stats.length}p · {new Date(match.created_at).toLocaleDateString()}
        </span>
      </button>
      {expanded && (
        <div className="overflow-x-auto border-t border-gray-800 px-3 py-2">
          {match.ow_match_stats.length === 0 ? (
            <p className="text-xs text-gray-500">No player stats recorded.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-gray-500">
                <tr>
                  <th className="py-1 text-left font-medium">Player</th>
                  <th className="py-1 text-left font-medium">Hero</th>
                  {STAT_FIELDS.map((f) => (
                    <th key={f.key} className="py-1 text-right font-medium">
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {match.ow_match_stats.map((s) => (
                  <tr key={s.id} className="border-t border-gray-800/60">
                    <td className="py-1 font-medium text-gray-200">{s.profiles?.username ?? '—'}</td>
                    <td className="py-1 text-gray-300">{s.hero || '—'}</td>
                    {STAT_FIELDS.map((f) => (
                      <td key={f.key} className="py-1 text-right tabular-nums text-gray-300">
                        {s[f.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </li>
  )
}

function MatchForm({ profiles, currentUserId, defaultSeason, lastQueue, onSaved }) {
  const [map, setMap] = useState('')
  const [mode, setMode] = useState('')
  const [season, setSeason] = useState(defaultSeason)
  const [queue, setQueue] = useState(lastQueue)
  const [result, setResult] = useState('win')

  const handleMapChange = (value) => {
    setMap(value)
    const auto = modeForMap(value)
    if (auto) setMode(auto)
  }
  const [players, setPlayers] = useState(() => [emptyPlayer(currentUserId)])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const chosenIds = players.map((p) => p.player_id).filter(Boolean)

  const updatePlayer = (idx, patch) =>
    setPlayers((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const validPlayers = players.filter((p) => p.player_id)
    if (!map.trim()) return setError('Enter a map.')
    if (validPlayers.length === 0) return setError('Add at least one player.')

    setSaving(true)
    try {
      // 1) Insert the match and get its id back.
      const { data: match, error: matchErr } = await supabase
        .from('ow_matches')
        .insert({ map: map.trim(), result, mode: mode || null, season: season.trim() || null, queue })
        .select('id')
        .single()
      if (matchErr) throw matchErr

      // 2) Build one stats row per player with the returned match id (single batched insert).
      const statRows = validPlayers.map((p) => {
        const row = { match_id: match.id, player_id: p.player_id, hero: p.hero.trim() || null }
        for (const f of STAT_FIELDS) row[f.key] = p[f.key] === '' ? null : Number(p[f.key])
        return row
      })
      const { error: statsErr } = await supabase.from('ow_match_stats').insert(statRows)
      if (statsErr) {
        // Roll back the orphaned match so history stays consistent.
        await supabase.from('ow_matches').delete().eq('id', match.id)
        throw statsErr
      }
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 space-y-3 rounded-lg border border-gray-800 bg-gray-950/60 p-3">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input
          className="input"
          list="ow-maps"
          placeholder="Map"
          value={map}
          onChange={(e) => handleMapChange(e.target.value)}
          required
        />
        <datalist id="ow-maps">
          {OW_MAPS.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <datalist id="ow-heroes">
          {OW_HEROES.map((h) => (
            <option key={h} value={h} />
          ))}
        </datalist>
        <div className="flex overflow-hidden rounded-md border border-gray-700">
          {['win', 'loss'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setResult(r)}
              className={`px-3 text-sm font-medium transition ${
                result === r
                  ? r === 'win'
                    ? 'bg-green-600 text-white'
                    : 'bg-red-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              {r === 'win' ? 'Win' : 'Loss'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <select className="input" value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Mode">
          <option value="">Mode…</option>
          {MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <input
          className="input"
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          placeholder="Season"
          aria-label="Season"
        />
        <select className="input" value={queue} onChange={(e) => setQueue(e.target.value)} aria-label="Queue">
          {QUEUES.map((q) => (
            <option key={q.value} value={q.value}>
              {q.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {players.map((p, idx) => (
          <div key={idx} className="rounded-md border border-gray-800 p-2">
            <div className="mb-2 grid grid-cols-[1fr_1fr_auto] gap-2">
              <select
                className="input"
                value={p.player_id}
                onChange={(e) => updatePlayer(idx, { player_id: e.target.value })}
                required
              >
                <option value="">Player…</option>
                {profiles.map((pr) => (
                  <option
                    key={pr.id}
                    value={pr.id}
                    disabled={pr.id !== p.player_id && chosenIds.includes(pr.id)}
                  >
                    {pr.username}
                  </option>
                ))}
              </select>
              <input
                className="input"
                placeholder="Hero"
                list="ow-heroes"
                value={p.hero}
                onChange={(e) => updatePlayer(idx, { hero: e.target.value })}
              />
              <button
                type="button"
                className="btn-ghost px-2"
                onClick={() => setPlayers((prev) => prev.filter((_, i) => i !== idx))}
                disabled={players.length === 1}
                title="Remove player"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {STAT_FIELDS.map((f) => (
                <input
                  key={f.key}
                  className="input px-2"
                  type="number"
                  min="0"
                  placeholder={f.label}
                  value={p[f.key]}
                  onChange={(e) => updatePlayer(idx, { [f.key]: e.target.value })}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setPlayers((prev) => [...prev, emptyPlayer()])}
          disabled={players.length >= Math.max(profiles.length, 1)}
        >
          <Plus className="h-4 w-4" /> Player
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save match'}
        </button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  )
}
