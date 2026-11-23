/** Pill-style checkboxes for picking squad members. */
export default function PlayerPicker({ profiles, selected, onChange, label, icon: Icon, hint }) {
  const toggle = (id) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])

  if (profiles.length === 0) return null

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-400">
          {Icon && <Icon className="h-3.5 w-3.5" />} {label}
        </span>
        {selected.length > 0 && (
          <button className="text-xs text-indigo-400 hover:underline" onClick={() => onChange([])}>
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {profiles.map((p) => {
          const on = selected.includes(p.id)
          return (
            <label
              key={p.id}
              className={`flex cursor-pointer items-center gap-1.5 para border px-2.5 py-1 text-xs transition ${
                on
                  ? 'border-indigo-500 bg-indigo-500/20 text-indigo-200'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              <input
                type="checkbox"
                className="h-3 w-3 accent-indigo-500"
                checked={on}
                onChange={() => toggle(p.id)}
              />
              {p.username}
            </label>
          )
        })}
      </div>
      {hint && <p className="mt-2 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}
