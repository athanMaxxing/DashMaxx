export default function GadgetCard({ title, icon: Icon, actions, className = '', children }) {
  return (
    <section
      className={`flex min-w-0 flex-col rounded-xl border border-gray-800 bg-gray-900/60 shadow-lg ${className}`}
    >
      <header className="flex items-center justify-between gap-2 border-b border-gray-800 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-200">
          {Icon && <Icon className="h-4 w-4 text-indigo-400" />}
          {title}
        </h2>
        {actions}
      </header>
      <div className="flex-1 p-4">{children}</div>
    </section>
  )
}

export function GadgetMessage({ children, tone = 'muted' }) {
  const color = tone === 'error' ? 'text-red-400' : 'text-gray-500'
  return <p className={`py-6 text-center text-sm ${color}`}>{children}</p>
}
