import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Database, RefreshCw, ShieldAlert, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { MATCHES_CHANGED_EVENT } from '../lib/overwatch'
import { FN_MATCHES_CHANGED_EVENT } from '../lib/fortnite'
import { BOUNTIES_CHANGED_EVENT } from '../lib/time'
import { useSquadData } from '../context/SquadDataContext'
import GadgetCard from '../components/GadgetCard'

const date = (iso) => (iso ? new Date(iso).toLocaleString() : '')

/*
 * Everything an admin can clear. `pk` = columns that identify one row.
 * Deleting a parent also removes its children (match stats, likes, sprite ticks) via ON DELETE CASCADE.
 */
const DATASETS = [
  {
    table: 'ow_matches',
    label: 'Overwatch matches',
    note: 'Also removes their player stats.',
    select: 'id, map, result, season, created_at',
    pk: ['id'],
    describe: (r) => `${r.map} · ${r.result} · ${r.season ?? ''}`,
    when: (r) => r.created_at,
    event: MATCHES_CHANGED_EVENT,
  },
  {
    table: 'fn_matches',
    label: 'Fortnite matches',
    note: 'Also removes their kill stats.',
    select: 'id, mode, won, created_at',
    pk: ['id'],
    describe: (r) => `${r.mode} · ${r.won ? 'Win' : 'Loss'}`,
    when: (r) => r.created_at,
    event: FN_MATCHES_CHANGED_EVENT,
  },
  {
    table: 'squad_bounties',
    label: 'Bounties',
    select: 'id, game, description, created_at',
    pk: ['id'],
    describe: (r) => `${r.game}: ${r.description}`,
    when: (r) => r.created_at,
    event: BOUNTIES_CHANGED_EVENT,
  },
  {
    table: 'squad_goals',
    label: 'Squad goals',
    select: 'id, title, progress, target, created_at',
    pk: ['id'],
    describe: (r) => `${r.title} (${r.progress}/${r.target})`,
    when: (r) => r.created_at,
  },
  {
    table: 'quotes',
    label: 'Quotes',
    note: 'Also removes their fires.',
    select: 'id, body, created_at',
    pk: ['id'],
    describe: (r) => `“${r.body}”`,
    when: (r) => r.created_at,
  },
  {
    table: 'shoutbox_messages',
    label: 'Shoutbox messages',
    select: 'id, user_id, body, created_at',
    pk: ['id'],
    describe: (r, u) => `${u[r.user_id] ?? '?'}: ${r.body}`,
    when: (r) => r.created_at,
  },
  {
    table: 'squad_schedule',
    label: 'Schedule entries',
    select: 'user_id, day_of_week, status',
    pk: ['user_id', 'day_of_week'],
    describe: (r, u) => `${u[r.user_id] ?? '?'} · ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][r.day_of_week] ?? r.day_of_week} · ${r.status ?? 'unknown'}`,
  },
  {
    table: 'squad_status',
    label: 'Ready Check statuses',
    select: 'user_id, status, game, updated_at',
    pk: ['user_id'],
    describe: (r, u) => `${u[r.user_id] ?? '?'} · ${r.status}${r.game ? ` · ${r.game}` : ''}`,
    when: (r) => r.updated_at,
  },
  {
    table: 'fortnite_sprites',
    label: 'Fortnite sprites',
    note: 'Removing a sprite also removes everyone’s ticks for it.',
    select: 'id, name, season, rarity',
    pk: ['id'],
    describe: (r) => `${r.name} · ${r.rarity} · ${r.season}`,
  },
  {
    table: 'sprite_collection',
    label: 'Sprite ticks',
    select: 'user_id, sprite_id, variant',
    pk: ['user_id', 'sprite_id', 'variant'],
    describe: (r, u) => `${u[r.user_id] ?? '?'} · sprite #${r.sprite_id} · ${r.variant}`,
  },
]

const NOT_ALLOWED = 'Nothing was deleted — check that supabase/004_admin_and_quotes.sql has been run and you are marked admin.'

const keyOf = (ds, row) => ds.pk.map((k) => row[k]).join('|')
const matchOf = (ds, row) => Object.fromEntries(ds.pk.map((k) => [k, row[k]]))

export default function AdminPanel() {
  const { usernames } = useSquadData()
  const [counts, setCounts] = useState({})
  const [open, setOpen] = useState(null)

  const loadCounts = useCallback(async () => {
    const results = await Promise.all(
      DATASETS.map((ds) => supabase.from(ds.table).select('*', { count: 'exact', head: true })),
    )
    setCounts(Object.fromEntries(DATASETS.map((ds, i) => [ds.table, results[i].error ? '!' : results[i].count])))
  }, [])

  useEffect(() => {
    loadCounts()
  }, [loadCounts])

  return (
    <div className="space-y-4">
      <div className="card flex items-start gap-3 border-rose-500/20 p-4">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
        <div className="text-sm text-gray-300">
          <p className="font-semibold text-rose-200">Admin tools</p>
          <p>
            Deleting here is permanent and affects everyone in the squad. Delete single rows, or use{' '}
            <span className="font-medium text-gray-100">Clear all</span> to wipe a whole table of test data.
          </p>
        </div>
        <button className="btn-ghost ml-auto shrink-0 p-1.5" onClick={loadCounts} title="Refresh counts">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <GadgetCard title="Data" icon={Database}>
        <ul className="divide-y divide-white/[0.06]">
          {DATASETS.map((ds) => (
            <DatasetRow
              key={ds.table}
              ds={ds}
              count={counts[ds.table]}
              usernames={usernames}
              open={open === ds.table}
              onToggle={() => setOpen((cur) => (cur === ds.table ? null : ds.table))}
              onChanged={loadCounts}
            />
          ))}
        </ul>
      </GadgetCard>
    </div>
  )
}

function DatasetRow({ ds, count, usernames, open, onToggle, onChanged }) {
  const [rows, setRows] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmText, setConfirmText] = useState('')

  const load = useCallback(async () => {
    setError('')
    let q = supabase.from(ds.table).select(ds.select).limit(200)
    if (ds.select.includes('created_at')) q = q.order('created_at', { ascending: false })
    const { data, error: err } = await q
    if (err) setError(err.message)
    else setRows(data)
  }, [ds])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  const afterChange = () => {
    if (ds.event) window.dispatchEvent(new Event(ds.event))
    onChanged()
  }

  async function removeRow(row) {
    setBusy(true)
    const { data, error: err } = await supabase.from(ds.table).delete().match(matchOf(ds, row)).select(ds.pk.join(','))
    setBusy(false)
    if (err) return setError(err.message)
    // RLS hides blocked deletes as "0 rows" rather than an error.
    if (!data?.length) return setError(NOT_ALLOWED)
    setRows((prev) => prev.filter((r) => keyOf(ds, r) !== keyOf(ds, row)))
    afterChange()
  }

  async function clearAll() {
    setBusy(true)
    setError('')
    // PostgREST requires a filter on delete; "first key is not null" matches every row.
    const { data, error: err } = await supabase.from(ds.table).delete().not(ds.pk[0], 'is', null).select(ds.pk.join(','))
    setBusy(false)
    setConfirmText('')
    if (err) return setError(err.message)
    if (!data?.length) return setError(NOT_ALLOWED)
    await load() // anything left over was blocked by permissions
    if (data.length < rows.length) setError(`Deleted ${data.length}; some rows were not allowed. ${NOT_ALLOWED}`)
    afterChange()
  }

  const Chevron = open ? ChevronDown : ChevronRight

  return (
    <li className="py-2">
      <button onClick={onToggle} className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-white/[0.03]">
        <Chevron className="h-4 w-4 text-gray-500" />
        <span className="flex-1 text-sm font-medium text-gray-200">{ds.label}</span>
        <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-xs tabular-nums text-gray-400">
          {count ?? '…'}
        </span>
      </button>

      {open && (
        <div className="mt-2 space-y-3 px-2 pb-2">
          {ds.note && <p className="text-xs text-gray-500">{ds.note}</p>}
          {error && <p className="text-sm text-rose-400">{error}</p>}

          {rows.length === 0 ? (
            <p className="text-sm text-gray-500">Nothing here.</p>
          ) : (
            <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
              {rows.map((r) => (
                <li key={keyOf(ds, r)} className="flex items-center gap-2 rounded-md bg-gray-950/50 px-2 py-1.5 text-sm">
                  <span className="min-w-0 flex-1 truncate text-gray-300">{ds.describe(r, usernames)}</span>
                  {ds.when && <span className="shrink-0 text-[11px] text-gray-600">{date(ds.when(r))}</span>}
                  <button
                    className="shrink-0 rounded p-1 text-gray-500 hover:bg-rose-500/10 hover:text-rose-400"
                    onClick={() => removeRow(r)}
                    disabled={busy}
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {rows.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 p-2">
              <span className="text-xs text-rose-200">
                Type <code className="rounded bg-black/30 px-1">DELETE</code> to clear all {count} {ds.label.toLowerCase()}:
              </span>
              <input
                className="input w-28 py-1 text-xs"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
              />
              <button className="btn-danger py-1 text-xs" disabled={busy || confirmText !== 'DELETE'} onClick={clearAll}>
                <Trash2 className="h-3.5 w-3.5" /> Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  )
}
