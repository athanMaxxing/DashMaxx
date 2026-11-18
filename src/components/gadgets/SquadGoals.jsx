import { useCallback, useEffect, useState } from 'react'
import { Flag, Minus, Plus, Trash2, Trophy } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useSquadData } from '../../context/SquadDataContext'
import GadgetCard, { GadgetMessage } from '../GadgetCard'

/** Shared squad targets with progress bars anyone can bump. */
export default function SquadGoals() {
  const { user } = useAuth()
  const { usernames } = useSquadData()
  const [goals, setGoals] = useState([])
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('squad_goals')
      .select('id, title, target, progress, created_by, created_at')
      .order('created_at', { ascending: false })
    if (err) setError(err.message)
    else setGoals(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function addGoal(e) {
    e.preventDefault()
    const t = Number(target)
    if (!title.trim() || !(t > 0)) return
    setError('')
    const { data, error: err } = await supabase
      .from('squad_goals')
      .insert({ title: title.trim(), target: Math.round(t), created_by: user.id })
      .select('id, title, target, progress, created_by, created_at')
      .single()
    if (err) setError(err.message)
    else {
      setGoals((prev) => [data, ...prev])
      setTitle('')
      setTarget('')
    }
  }

  async function bump(goal, delta) {
    const progress = Math.max(0, goal.progress + delta)
    if (progress === goal.progress) return
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...g, progress } : g)))
    const { error: err } = await supabase.from('squad_goals').update({ progress }).eq('id', goal.id)
    if (err) {
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? goal : g)))
      setError(err.message)
    }
  }

  async function remove(goal) {
    setGoals((prev) => prev.filter((g) => g.id !== goal.id))
    const { error: err } = await supabase.from('squad_goals').delete().eq('id', goal.id)
    if (err) {
      setError(err.message)
      load()
    }
  }

  // Active goals first, completed at the bottom.
  const sorted = [...goals].sort((a, b) => (a.progress >= a.target) - (b.progress >= b.target))

  return (
    <GadgetCard title="Squad Goals" icon={Flag}>
      <form onSubmit={addGoal} className="mb-4 flex gap-2">
        <input
          className="input"
          placeholder="Goal (e.g. 50 comp wins)"
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input
          className="input w-20 shrink-0"
          type="number"
          min="1"
          placeholder="Target"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          required
        />
        <button type="submit" className="btn-primary shrink-0 px-3" title="Add goal">
          <Plus className="h-4 w-4" />
        </button>
      </form>

      {error && <p className="mb-2 text-sm text-red-400">{error}</p>}

      {loading ? (
        <GadgetMessage>Loading…</GadgetMessage>
      ) : sorted.length === 0 ? (
        <GadgetMessage>No goals yet. Set one for the squad.</GadgetMessage>
      ) : (
        <ul className="max-h-[24rem] space-y-2 overflow-y-auto pr-1">
          {sorted.map((g) => {
            const pct = Math.min(100, Math.round((g.progress / g.target) * 100))
            const done = g.progress >= g.target
            return (
              <li key={g.id} className={`rounded-lg border px-3 py-2 ${done ? 'border-green-800/60 bg-green-500/5' : 'border-gray-800 bg-gray-950/50'}`}>
                <div className="flex items-center gap-2">
                  {done && <Trophy className="h-4 w-4 shrink-0 text-amber-300" />}
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-gray-200" title={g.title}>
                    {g.title}
                  </p>
                  <span className="shrink-0 text-xs tabular-nums text-gray-400">
                    {g.progress}/{g.target}
                  </span>
                  <button className="btn-ghost p-1" onClick={() => bump(g, -1)} title="−1" disabled={g.progress === 0}>
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <button className="btn-ghost p-1" onClick={() => bump(g, 1)} title="+1">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  {g.created_by === user.id && (
                    <button className="p-1 text-gray-600 hover:text-red-400" onClick={() => remove(g)} title="Delete goal">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-800">
                  <div className={`h-full transition-all ${done ? 'bg-green-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-gray-600">set by {usernames[g.created_by] ?? 'someone'}</p>
              </li>
            )
          })}
        </ul>
      )}
    </GadgetCard>
  )
}
