import { useMemo, useState } from 'react'
import { Car, Crown, Filter, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useSquadData } from '../../context/SquadDataContext'
import { useRocketLeagueData } from '../../context/RocketLeagueDataContext'
import { pct } from '../../lib/fortnite'
import { lastMmr, PLAYLISTS, playlistLabel, RL_MATCHES_CHANGED_EVENT, rlPlayedTogether } from '../../lib/rocketleague'
import GadgetCard, { GadgetMessage, GadgetSkeleton } from '../GadgetCard'
import { useToast } from '../Toast'
import PlayerPicker from '../PlayerPicker'
import RankBadge, { Delta } from '../RankBadge'

/** MMR change per (match, player) compared with that player's previous ranked game in the same playlist. */
function useMmrDeltas(matches) {
  return useMemo(() => {
    const deltas = new Map()
    const last = new Map() // player|playlist -> mmr
    for (const m of [...matches].reverse()) {
      if (!m.ranked) continue
      for (const s of m.rl_match_stats) {
        if (s.mmr == null) continue
        const k = `${s.player_id}|${m.team_size}`
        if (last.has(k)) deltas.set(`${m.id}|${s.player_id}`, s.mmr - last.get(k))
        last.set(k, s.mmr)
      }
    }
    return deltas
  }, [matches])
}

/** Log Rocket League games (ranked or not, playlist, score, per-player stats, MMR) and browse history. */
export default function RlMatchTracker() {
  const { user, profile } = useAuth()
  const toast = useToast()
  const { profiles } = useSquadData()
  const { matches, filteredMatches, filtersActive, loading, error, reload } = useRocketLeagueData()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [together, setTogether] = useState([])
  const deltas = useMmrDeltas(matches)

  const canManage = (m) => m.created_by === user.id || Boolean(profile?.is_admin)
  const closeForm = () => {
    setShowForm(false)
    setEditing(null)
  }

  const shown = useMemo(() => rlPlayedTogether(filteredMatches, together), [filteredMatches, together])
  const wins = shown.filter((m) => m.won).length

  async function remove(match) {
    if (!window.confirm(`Delete this ${match.won ? 'win' : 'loss'} (${match.our_goals}–${match.their_goals})? This can't be undone.`)) return
    const { data, error: err } = await supabase.from('rl_matches').delete().eq('id', match.id).select('id')
    if (err || !data?.length) return toast.error(err?.message ?? "You can't delete this game.")
    toast.success('Game deleted')
    window.dispatchEvent(new Event(RL_MATCHES_CHANGED_EVENT))
  }

  return (
    <GadgetCard
      title="Match Tracker"
      icon={Car}
      actions={
        <div className="flex gap-1">
          <button className="btn-ghost p-1.5" onClick={reload} title="Refresh" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button className="btn-primary py-1.5" onClick={() => (showForm ? closeForm() : setShowForm(true))}>
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Close' : 'Log game'}
          </button>
        </div>
      }
    >
      {showForm && (
        <RlMatchForm
          key={editing?.id ?? 'new'}
          initial={editing}
          matches={matches}
          profiles={profiles}
          currentUserId={user.id}
          defaults={matches[0]}
          onCancel={closeForm}
          onSaved={() => {
            toast.success(editing ? 'Game updated' : 'Game saved')
            closeForm()
            window.dispatchEvent(new Event(RL_MATCHES_CHANGED_EVENT))
          }}
        />
      )}

      <PlayerPicker profiles={profiles} selected={together} onChange={setTogether} label="Played together" icon={Filter} />

      {!loading && !error && shown.length > 0 && (
        <p className="mb-2 text-xs text-gray-400">
          {shown.length} game{shown.length === 1 ? '' : 's'} · <span className="text-emerald-400">{wins}W</span>{' '}
          <span className="text-rose-400">{shown.length - wins}L</span> · {pct(wins, shown.length)}% win rate
        </p>
      )}

      {error ? (
        <GadgetMessage tone="error">{error}</GadgetMessage>
      ) : loading && matches.length === 0 ? (
        <GadgetSkeleton />
      ) : shown.length === 0 ? (
        <GadgetMessage>
          {together.length ? 'No games with that squad together.' : filtersActive ? 'No games for these filters.' : 'No games logged yet.'}
        </GadgetMessage>
      ) : (
        <ul className="max-h-[30rem] space-y-1.5 overflow-y-auto pr-1">
          {shown.slice(0, 100).map((m) => (
            <li key={m.id} className="group rounded-lg border border-gray-800 bg-gray-950/50 px-3 py-2">
              <div className="flex items-center gap-2">
                <span
                  className={`w-12 shrink-0 rounded px-1.5 py-0.5 text-center text-xs font-bold ${
                    m.won ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/10 text-rose-300'
                  }`}
                >
                  {m.won ? 'Win' : 'Loss'}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  <span className="tabular-nums">
                    {m.our_goals}–{m.their_goals}
                  </span>{' '}
                  · {m.ranked ? 'Ranked' : 'Casual'} {playlistLabel(m.team_size)}
                  {m.fill && <span className="ml-2 text-xs font-normal text-gray-500">Fill</span>}
                </span>
                <span className="shrink-0 text-xs text-gray-500">{new Date(m.created_at).toLocaleDateString()}</span>
                {canManage(m) && (
                  <span className="flex shrink-0 gap-0.5 opacity-100 transition sm:opacity-0 sm:focus-within:opacity-100 sm:group-hover:opacity-100">
                    <button
                      className="rounded p-1 text-gray-500 hover:bg-white/5 hover:text-gray-200"
                      onClick={() => {
                        setEditing(m)
                        setShowForm(true)
                      }}
                      title="Edit game"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button className="rounded p-1 text-gray-500 hover:bg-rose-500/10 hover:text-rose-400" onClick={() => remove(m)} title="Delete game">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )}
              </div>
              <ul className="mt-1.5 space-y-1 pl-14 text-xs text-gray-400">
                {[...m.rl_match_stats]
                  .sort((a, b) => b.score - a.score)
                  .map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-medium text-gray-200">{s.profiles?.username ?? '?'}</span>
                      {s.mvp && (
                        <span className="inline-flex items-center gap-0.5 font-semibold text-amber-300">
                          <Crown className="h-3 w-3" /> MVP
                        </span>
                      )}
                      <span className="tabular-nums">
                        {s.goals}G {s.assists}A {s.saves}S · {s.score} pts
                      </span>
                      {m.ranked && s.mmr != null && (
                        <span className="inline-flex items-center gap-1">
                          <RankBadge mmr={s.mmr} playlist={m.team_size} size="xs" showDivision={false} />
                          <span className="tabular-nums text-gray-300">{s.mmr}</span>
                          <Delta value={deltas.get(`${m.id}|${s.player_id}`)} />
                        </span>
                      )}
                    </li>
                  ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </GadgetCard>
  )
}

const STAT_FIELDS = [
  ['goals', 'Goals'],
  ['assists', 'Assists'],
  ['saves', 'Saves'],
  ['score', 'Points'],
]

const blankPlayer = (player_id = '', mmr = '') => ({ player_id, goals: '', assists: '', saves: '', score: '', mvp: false, mmr: String(mmr) })

function RlMatchForm({ initial, matches, profiles, currentUserId, defaults, onSaved, onCancel }) {
  const [ranked, setRanked] = useState(initial?.ranked ?? defaults?.ranked ?? true)
  const [teamSize, setTeamSize] = useState(initial?.team_size ?? defaults?.team_size ?? 2)
  const [won, setWon] = useState(initial?.won ?? true)
  const [ourGoals, setOurGoals] = useState(initial ? String(initial.our_goals) : '')
  const [theirGoals, setTheirGoals] = useState(initial ? String(initial.their_goals) : '')
  const [fill, setFill] = useState(initial?.fill ?? false)
  const [players, setPlayers] = useState(() => {
    if (initial?.rl_match_stats?.length) {
      return initial.rl_match_stats.map((s) => ({
        player_id: s.player_id,
        goals: String(s.goals),
        assists: String(s.assists),
        saves: String(s.saves),
        score: String(s.score),
        mvp: s.mvp,
        mmr: s.mmr == null ? '' : String(s.mmr),
      }))
    }
    // New game: same squad as last time if it fits, else just me.
    const size = defaults?.team_size ?? 2
    const lastSquad = defaults?.rl_match_stats?.map((s) => s.player_id).filter(Boolean) ?? []
    const ids = lastSquad.length && lastSquad.length <= size ? lastSquad : [currentUserId]
    const isRanked = defaults?.ranked ?? true
    return ids.map((id) => blankPlayer(id, isRanked ? lastMmr(matches, id, size) : ''))
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const chosen = players.map((p) => p.player_id).filter(Boolean)
  const tooMany = players.length > teamSize
  const canFill = players.length < teamSize
  const showMmr = ranked && teamSize !== 4

  const update = (i, patch) => setPlayers((prev) => prev.map((p, j) => (j === i ? { ...p, ...patch } : p)))

  // Re-suggest everyone's last MMR for this playlist when it changes (new games only).
  const refillMmr = (size, isRanked) => {
    if (initial) return
    setPlayers((prev) => prev.map((p) => ({ ...p, mmr: isRanked && p.player_id ? String(lastMmr(matches, p.player_id, size)) : '' })))
  }

  function pickPlaylist(size) {
    setTeamSize(size)
    const isRanked = size === 4 ? false : ranked
    if (size === 4) setRanked(false)
    refillMmr(size, isRanked)
  }

  function pickRanked(val) {
    setRanked(val)
    refillMmr(teamSize, val)
  }

  function setScore(ours, theirs) {
    setOurGoals(ours)
    setTheirGoals(theirs)
    if (ours !== '' && theirs !== '' && Number(ours) !== Number(theirs)) setResult(Number(ours) > Number(theirs))
  }

  function setResult(win) {
    setWon(win)
    // The MVP always comes from the winning team.
    if (!win) setPlayers((prev) => prev.map((p) => ({ ...p, mvp: false })))
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    const valid = players.filter((p) => p.player_id)
    if (valid.length === 0) return setError('Add at least one player.')
    if (valid.length > teamSize) return setError(`${playlistLabel(teamSize)} has room for ${teamSize}. Remove ${valid.length - teamSize} player(s).`)
    if (ourGoals === '' || theirGoals === '') return setError('Enter the final score.')
    if (Number(ourGoals) === Number(theirGoals)) return setError('Rocket League games can’t end in a draw. Check the score.')
    if (won !== Number(ourGoals) > Number(theirGoals)) return setError('The score doesn’t match Win/Loss.')
    setSaving(true)
    try {
      const fields = {
        won,
        ranked: ranked && teamSize !== 4,
        team_size: teamSize,
        fill: canFill && fill,
        our_goals: Number(ourGoals),
        their_goals: Number(theirGoals),
      }
      const { data: match, error: mErr } = initial
        ? await supabase.from('rl_matches').update(fields).eq('id', initial.id).select('id').single()
        : await supabase.from('rl_matches').insert(fields).select('id').single()
      if (mErr) throw mErr
      if (initial) {
        const { error: delErr } = await supabase.from('rl_match_stats').delete().eq('match_id', match.id)
        if (delErr) throw delErr
      }
      const rows = valid.map((p) => ({
        match_id: match.id,
        player_id: p.player_id,
        goals: Number(p.goals) || 0,
        assists: Number(p.assists) || 0,
        saves: Number(p.saves) || 0,
        score: Number(p.score) || 0,
        mvp: won && p.mvp,
        mmr: showMmr && p.mmr !== '' ? Number(p.mmr) : null,
      }))
      const { error: sErr } = await supabase.from('rl_match_stats').insert(rows)
      if (sErr) {
        if (!initial) await supabase.from('rl_matches').delete().eq('id', match.id)
        throw sErr
      }
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const seg = (on) => `rounded-md py-1.5 text-sm font-medium transition ${on ? 'bg-sky-500/25 text-sky-100 ring-1 ring-sky-400/50' : 'text-gray-400 hover:text-gray-200'}`

  return (
    <form onSubmit={submit} className="mb-4 space-y-3 rounded-xl border border-white/[0.07] bg-gray-950/60 p-3">
      {initial && <p className="text-xs font-semibold uppercase tracking-wide text-sky-300">Editing game</p>}

      <div className="grid grid-cols-2 gap-1 rounded-lg bg-gray-950/70 p-1 ring-1 ring-white/5">
        <button type="button" className={seg(ranked && teamSize !== 4)} onClick={() => pickRanked(true)} disabled={teamSize === 4}>
          Ranked
        </button>
        <button type="button" className={seg(!ranked || teamSize === 4)} onClick={() => pickRanked(false)}>
          Unranked
        </button>
      </div>

      <div className="grid grid-cols-4 gap-1 rounded-lg bg-gray-950/70 p-1 ring-1 ring-white/5">
        {PLAYLISTS.map((p) => (
          <button key={p.value} type="button" className={seg(teamSize === p.value)} onClick={() => pickPlaylist(p.value)} title={p.long}>
            {p.label}
          </button>
        ))}
      </div>
      {teamSize === 4 && <p className="-mt-1 text-[11px] text-gray-500">Chaos is casual only, so no MMR.</p>}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <input
            className="input w-16 px-1 text-center tabular-nums"
            type="number"
            min="0"
            max="99"
            placeholder="Us"
            value={ourGoals}
            onChange={(e) => setScore(e.target.value, theirGoals)}
            aria-label="Our goals"
          />
          <span className="text-gray-500">–</span>
          <input
            className="input w-16 px-1 text-center tabular-nums"
            type="number"
            min="0"
            max="99"
            placeholder="Them"
            value={theirGoals}
            onChange={(e) => setScore(ourGoals, e.target.value)}
            aria-label="Their goals"
          />
        </div>
        <div className="flex overflow-hidden rounded-md border border-gray-700">
          {[
            [true, 'Win', 'bg-emerald-600 text-white'],
            [false, 'Loss', 'bg-rose-600 text-white'],
          ].map(([val, label, cls]) => (
            <button
              key={label}
              type="button"
              onClick={() => setResult(val)}
              className={`px-3 py-1.5 text-sm font-medium transition ${won === val ? cls : 'text-gray-400 hover:bg-gray-800'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className={`flex items-center gap-2 text-sm ${canFill ? 'cursor-pointer text-gray-300' : 'cursor-not-allowed text-gray-600'}`}>
          <input
            type="checkbox"
            className="h-4 w-4 accent-sky-500"
            checked={canFill && fill}
            disabled={!canFill}
            onChange={(e) => setFill(e.target.checked)}
          />
          Fill {canFill ? '(randoms)' : teamSize === 1 ? '(not in Solo)' : '(team is full)'}
        </label>
      </div>

      <div className="space-y-2">
        {players.map((p, i) => {
          const prevMmr = p.player_id ? lastMmr(initial ? matches.filter((m) => m.id !== initial.id) : matches, p.player_id, teamSize) : ''
          return (
            <div key={i} className={`space-y-1.5 rounded-lg bg-white/[0.02] p-2 ring-1 ${i >= teamSize ? 'ring-rose-500/60' : 'ring-white/[0.05]'}`}>
              <div className="flex gap-2">
                <select
                  className="input min-w-0 flex-1"
                  value={p.player_id}
                  onChange={(e) => update(i, { player_id: e.target.value, mmr: showMmr ? String(lastMmr(matches, e.target.value, teamSize)) : '' })}
                  required
                >
                  <option value="">Player…</option>
                  {profiles.map((pr) => (
                    <option key={pr.id} value={pr.id} disabled={pr.id !== p.player_id && chosen.includes(pr.id)}>
                      {pr.username}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setPlayers((prev) => prev.map((x, j) => ({ ...x, mvp: j === i ? !x.mvp : false })))}
                  disabled={!won}
                  title={won ? 'MVP of the game' : 'MVP is always on the winning team'}
                  className={`flex items-center gap-1 rounded-md px-2.5 text-xs font-semibold ring-1 transition disabled:opacity-30 ${
                    p.mvp ? 'bg-amber-400/20 text-amber-200 ring-amber-400/60' : 'text-gray-400 ring-gray-700 hover:text-gray-200'
                  }`}
                >
                  <Crown className="h-3.5 w-3.5" /> MVP
                </button>
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
              <div className={`grid gap-1.5 ${showMmr ? 'grid-cols-4 sm:grid-cols-5' : 'grid-cols-4'}`}>
                {STAT_FIELDS.map(([key, label]) => (
                  <label key={key} className="block">
                    <span className="mb-0.5 block text-[10px] uppercase tracking-wide text-gray-500">{label}</span>
                    <input
                      className="input px-2 tabular-nums"
                      type="number"
                      min="0"
                      inputMode="numeric"
                      placeholder="0"
                      value={p[key]}
                      onChange={(e) => update(i, { [key]: e.target.value })}
                    />
                  </label>
                ))}
                {showMmr && (
                  <label className="col-span-4 block sm:col-span-1">
                    <span className="mb-0.5 flex items-center justify-between text-[10px] uppercase tracking-wide text-gray-500">
                      MMR after
                      {p.mmr !== '' && prevMmr !== '' && <Delta value={Number(p.mmr) - prevMmr} className="normal-case" />}
                    </span>
                    <input
                      className="input px-2 tabular-nums"
                      type="number"
                      min="0"
                      max="3000"
                      inputMode="numeric"
                      placeholder={prevMmr !== '' ? `Last ${prevMmr}` : 'e.g. 850'}
                      value={p.mmr}
                      onChange={(e) => update(i, { mmr: e.target.value })}
                    />
                  </label>
                )}
              </div>
              {showMmr && p.mmr !== '' && (
                <div className="flex justify-end">
                  <RankBadge mmr={Number(p.mmr)} playlist={teamSize} size="xs" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setPlayers((prev) => [...prev, blankPlayer()])}
          disabled={players.length >= Math.min(teamSize, Math.max(profiles.length, 1))}
        >
          <Plus className="h-4 w-4" /> Player
        </button>
        <div className="flex gap-2">
          {initial && (
            <button type="button" className="btn-ghost" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button type="submit" className="btn-primary" disabled={saving || tooMany}>
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Save game'}
          </button>
        </div>
      </div>
      {tooMany && (
        <p className="text-sm text-rose-400">
          {playlistLabel(teamSize)} only has room for {teamSize}. Remove {players.length - teamSize} player{players.length - teamSize === 1 ? '' : 's'}.
        </p>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {showMmr && <p className="text-[11px] text-gray-600">Enter the MMR shown after the game. Rank names are approximate.</p>}
    </form>
  )
}
