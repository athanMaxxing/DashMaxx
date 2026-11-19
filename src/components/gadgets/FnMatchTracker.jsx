import { useMemo, useState } from 'react'
import { Crosshair, Filter, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useSquadData } from '../../context/SquadDataContext'
import { useFortniteData } from '../../context/FortniteDataContext'
import { FN_MATCHES_CHANGED_EVENT, FN_MODES, fnPlayedTogether, pct, TEAM_SIZES, teamSizeLabel, totalKills } from '../../lib/fortnite'
import GadgetCard, { GadgetMessage } from '../GadgetCard'
import PlayerPicker from '../PlayerPicker'

/** Log Fortnite games (win, mode, fill, dropped together, kills per player) and browse history. */
export default function FnMatchTracker() {
  const { user } = useAuth()
  const { profiles } = useSquadData()
  const { matches, filteredMatches, lastMode, filtersActive, loading, error, reload } = useFortniteData()
  const [showForm, setShowForm] = useState(false)
  const [together, setTogether] = useState([])

  const shown = useMemo(() => fnPlayedTogether(filteredMatches, together), [filteredMatches, together])
  const wins = shown.filter((m) => m.won).length

  async function remove(match) {
    if (!window.confirm('Delete this match?')) return
    const { error: err } = await supabase.from('fn_matches').delete().eq('id', match.id)
    if (err) window.alert(err.message)
    else window.dispatchEvent(new Event(FN_MATCHES_CHANGED_EVENT))
  }

  return (
    <GadgetCard
      title="Fortnite Match Tracker"
      icon={Crosshair}
      actions={
        <div className="flex gap-1">
          <button className="btn-ghost p-1.5" onClick={reload} title="Refresh" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button className="btn-primary py-1.5" onClick={() => setShowForm((v) => !v)}>
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Close' : 'Log game'}
          </button>
        </div>
      }
    >
      {showForm && (
        <FnMatchForm
          profiles={profiles}
          currentUserId={user.id}
          defaultMode={lastMode || 'Build'}
          defaultTeamSize={matches[0]?.team_size ?? 4}
          onSaved={() => {
            setShowForm(false)
            window.dispatchEvent(new Event(FN_MATCHES_CHANGED_EVENT))
          }}
        />
      )}

      <PlayerPicker profiles={profiles} selected={together} onChange={setTogether} label="Played together" icon={Filter} />

      {!loading && !error && shown.length > 0 && (
        <p className="mb-2 text-xs text-gray-400">
          {shown.length} game{shown.length === 1 ? '' : 's'} · <span className="text-amber-300">{wins} Victory Royale{wins === 1 ? '' : 's'}</span> ·{' '}
          {pct(wins, shown.length)}% win rate
        </p>
      )}

      {error ? (
        <GadgetMessage tone="error">{error}</GadgetMessage>
      ) : loading && matches.length === 0 ? (
        <GadgetMessage>Loading games…</GadgetMessage>
      ) : shown.length === 0 ? (
        <GadgetMessage>
          {together.length ? 'No games with that squad together.' : filtersActive ? 'No games for these filters.' : 'No games logged yet.'}
        </GadgetMessage>
      ) : (
        <ul className="max-h-[28rem] space-y-1.5 overflow-y-auto pr-1">
          {shown.slice(0, 100).map((m) => (
            <li key={m.id} className="group rounded-lg border border-gray-800 bg-gray-950/50 px-3 py-2">
              <div className="flex items-center gap-2">
                <span
                  className={`w-12 shrink-0 rounded px-1.5 py-0.5 text-center text-xs font-bold ${
                    m.won ? 'bg-amber-500/20 text-amber-300' : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {m.won ? '#1' : 'Loss'}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {m.mode} · {teamSizeLabel(m.team_size)}
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    {m.fill ? 'Fill' : 'No fill'} · {m.dropped_together ? 'Dropped together' : 'Split drop'}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-gray-500">
                  {totalKills(m)} kills · {new Date(m.created_at).toLocaleDateString()}
                </span>
                <button
                  className="p-0.5 text-gray-600 opacity-0 transition hover:text-red-400 focus:opacity-100 group-hover:opacity-100"
                  onClick={() => remove(m)}
                  title="Delete (only works on games you logged)"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 pl-14 text-xs text-gray-400">
                {[...m.fn_match_stats]
                  .sort((a, b) => b.kills - a.kills)
                  .map((s) => (
                    <span key={s.id}>
                      {s.profiles?.username ?? '?'} <span className="font-semibold text-gray-200">{s.kills}</span>
                    </span>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </GadgetCard>
  )
}

function Toggle({ label, checked, onChange, disabled = false }) {
  return (
    <label className={`flex items-center gap-2 text-sm ${disabled ? 'cursor-not-allowed text-gray-600' : 'cursor-pointer text-gray-300'}`}>
      <input
        type="checkbox"
        className="h-4 w-4 accent-indigo-500"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  )
}

function FnMatchForm({ profiles, currentUserId, defaultMode, defaultTeamSize, onSaved }) {
  const [won, setWon] = useState(false)
  const [mode, setMode] = useState(defaultMode)
  const [teamSize, setTeamSize] = useState(defaultTeamSize)
  const [fill, setFill] = useState(false)
  const [dropped, setDropped] = useState(true)
  const [players, setPlayers] = useState(() => [{ player_id: currentUserId, kills: '' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const chosen = players.map((p) => p.player_id).filter(Boolean)
  const tooMany = players.length > teamSize
  const sizeLabel = teamSizeLabel(teamSize)
  // Fill = randoms took the empty spots, so it needs a team with room left over.
  const canFill = players.length < teamSize

  const pickSize = (n) => setTeamSize(n)
  const update = (i, patch) => setPlayers((prev) => prev.map((p, j) => (j === i ? { ...p, ...patch } : p)))

  async function submit(e) {
    e.preventDefault()
    setError('')
    const valid = players.filter((p) => p.player_id)
    if (!mode.trim()) return setError('Pick a mode.')
    if (valid.length === 0) return setError('Add at least one player.')
    if (valid.length > teamSize)
      return setError(`${sizeLabel} allows ${teamSize} player${teamSize === 1 ? '' : 's'} — remove ${valid.length - teamSize} or pick a bigger team size.`)
    setSaving(true)
    try {
      const { data: match, error: mErr } = await supabase
        .from('fn_matches')
        .insert({ won, mode: mode.trim(), fill: canFill && fill, dropped_together: dropped, team_size: teamSize })
        .select('id')
        .single()
      if (mErr) throw mErr
      const rows = valid.map((p) => ({ match_id: match.id, player_id: p.player_id, kills: Number(p.kills) || 0 }))
      const { error: sErr } = await supabase.from('fn_match_stats').insert(rows)
      if (sErr) {
        await supabase.from('fn_matches').delete().eq('id', match.id)
        throw sErr
      }
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="mb-4 space-y-3 rounded-lg border border-gray-800 bg-gray-950/60 p-3">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input className="input" list="fn-modes" placeholder="Mode" value={mode} onChange={(e) => setMode(e.target.value)} required />
        <datalist id="fn-modes">
          {FN_MODES.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <div className="flex overflow-hidden rounded-md border border-gray-700">
          {[
            [true, 'Win', 'bg-amber-500 text-gray-950'],
            [false, 'Loss', 'bg-gray-600 text-white'],
          ].map(([val, label, cls]) => (
            <button
              key={label}
              type="button"
              onClick={() => setWon(val)}
              className={`px-3 text-sm font-medium transition ${won === val ? cls : 'text-gray-400 hover:bg-gray-800'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1 rounded-lg bg-gray-950/70 p-1 ring-1 ring-white/5">
        {TEAM_SIZES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => pickSize(t.value)}
            className={`rounded-md py-1.5 text-sm font-medium transition ${
              teamSize === t.value ? 'bg-violet-500/25 text-violet-100 ring-1 ring-violet-400/50' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-4">
        <Toggle label="Dropped together" checked={dropped} onChange={setDropped} />
        <Toggle
          label={canFill ? 'Fill (randoms)' : `Fill (randoms) — ${teamSize === 1 ? 'not in Solo' : 'team is full'}`}
          checked={canFill && fill}
          onChange={setFill}
          disabled={!canFill}
        />
      </div>

      <div className="space-y-2">
        {players.map((p, i) => (
          <div key={i} className={`grid grid-cols-[1fr_6rem_auto] gap-2 ${i >= teamSize ? 'rounded-lg ring-1 ring-rose-500/60' : ''}`}>
            <select className="input" value={p.player_id} onChange={(e) => update(i, { player_id: e.target.value })} required>
              <option value="">Player…</option>
              {profiles.map((pr) => (
                <option key={pr.id} value={pr.id} disabled={pr.id !== p.player_id && chosen.includes(pr.id)}>
                  {pr.username}
                </option>
              ))}
            </select>
            <input
              className="input"
              type="number"
              min="0"
              placeholder="Kills"
              value={p.kills}
              onChange={(e) => update(i, { kills: e.target.value })}
            />
            <button
              type="button"
              className="btn-ghost px-2"
              onClick={() => setPlayers((prev) => prev.filter((_, j) => j !== i))}
              disabled={players.length === 1}
              title="Remove player"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setPlayers((prev) => [...prev, { player_id: '', kills: '' }])}
          disabled={players.length >= Math.min(teamSize, Math.max(profiles.length, 1))}
          title={players.length >= teamSize ? `${sizeLabel} is full` : undefined}
        >
          <Plus className="h-4 w-4" /> Player
        </button>
        <button type="submit" className="btn-primary" disabled={saving || tooMany}>
          {saving ? 'Saving…' : 'Save game'}
        </button>
      </div>
      {tooMany && (
        <p className="text-sm text-rose-400">
          {sizeLabel} only has room for {teamSize} player{teamSize === 1 ? '' : 's'} — remove {players.length - teamSize} or pick a bigger team size.
        </p>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  )
}
