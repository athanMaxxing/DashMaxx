import { useEffect, useRef } from 'react'
import { Eye, EyeOff, X } from 'lucide-react'

/** Checkbox that also shows an "indeterminate" dash when only some children are on. */
function TriCheckbox({ checked, indeterminate, onChange, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])
  return (
    <input
      ref={ref}
      type="checkbox"
      className={`h-4 w-4 accent-indigo-500 ${className}`}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
  )
}

/**
 * Quick group chips + a panel listing every gadget, grouped.
 * Toggling a group shows/hides all of its gadgets at once.
 */
export function GroupChips({ sections, isVisible, setVisible }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {sections.map((s) => {
        const ids = s.gadgets.map((g) => g.id)
        const shown = ids.filter(isVisible).length
        const all = shown === ids.length
        const none = shown === 0
        return (
          <button
            key={s.id}
            onClick={() => setVisible(ids, none || !all ? true : false)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
              none
                ? 'border-gray-700 text-gray-500 hover:border-gray-500'
                : all
                  ? 'border-indigo-500 bg-indigo-500/20 text-indigo-200'
                  : 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300'
            }`}
            title={none ? `Show all ${s.title}` : all ? `Hide all ${s.title}` : `Show all ${s.title}`}
          >
            {none ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {s.short ?? s.title}
            {!all && !none && (
              <span className="text-[10px] text-indigo-400">
                {shown}/{ids.length}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default function GadgetCustomizer({ sections, isVisible, setVisible, onClose, error }) {
  const allIds = sections.flatMap((s) => s.gadgets.map((g) => g.id))

  return (
    <div className="card animate-fade-up p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200">Choose your gadgets</h3>
        <div className="flex items-center gap-3">
          <button className="text-xs text-indigo-400 hover:underline" onClick={() => setVisible(allIds, true)}>
            Show all
          </button>
          <button className="text-xs text-gray-400 hover:underline" onClick={() => setVisible(allIds, false)}>
            Hide all
          </button>
          <button className="btn-ghost p-1" onClick={onClose} title="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => {
          const ids = s.gadgets.map((g) => g.id)
          const shown = ids.filter(isVisible).length
          return (
            <div key={s.id} className="rounded-lg border border-gray-800 bg-gray-950/50 p-3">
              <label className="mb-2 flex cursor-pointer items-center gap-2 border-b border-gray-800 pb-2 text-sm font-semibold text-gray-100">
                <TriCheckbox
                  checked={shown === ids.length}
                  indeterminate={shown > 0 && shown < ids.length}
                  onChange={(on) => setVisible(ids, on)}
                />
                {s.title}
                <span className="ml-auto text-xs font-normal text-gray-500">
                  {shown}/{ids.length}
                </span>
              </label>
              <ul className="space-y-1">
                {s.gadgets.map((g) => (
                  <li key={g.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm text-gray-300 hover:bg-gray-800/50">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-indigo-500"
                        checked={isVisible(g.id)}
                        onChange={(e) => setVisible([g.id], e.target.checked)}
                      />
                      {g.title}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
      {error && <p className="mt-3 text-sm text-red-400">Couldn&apos;t save: {error}</p>}
      <p className="mt-3 text-[11px] text-gray-600">Saved to your account, so it follows you to any device.</p>
    </div>
  )
}
