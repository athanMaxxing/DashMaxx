import { Component } from 'react'
import { RefreshCw, TriangleAlert } from 'lucide-react'

const RELOAD_KEY = 'dashmaxx:chunk-reload'

/** A lazy chunk from an older deploy is gone (new version shipped while the app was open). */
export const isChunkError = (err) =>
  /dynamically imported module|Importing a module script failed|error loading dynamically imported|Loading chunk|Failed to fetch/i.test(
    String(err?.message ?? err),
  )

/** Reload once to pick up the new deploy; the guard stops a reload loop if it keeps failing. */
export function reloadForNewVersion() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0)
    if (Date.now() - last < 10_000) return false
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch {
    // storage blocked: still reload
  }
  window.location.reload()
  return true
}

/**
 * Catches render crashes so one broken card can't blank the whole app.
 * `fullscreen` is the last-resort boundary around the entire app.
 */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    console.error(error)
    if (isChunkError(error)) reloadForNewVersion()
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const chunk = isChunkError(error)
    const message = chunk ? 'A new version is out.' : 'Something went wrong here.'

    if (this.props.fullscreen) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-gray-950 p-6 text-center text-gray-300">
          <TriangleAlert className="h-10 w-10 text-amber-400" />
          <p>{message}</p>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" /> Reload
          </button>
        </div>
      )
    }

    return (
      <div className="card flex items-center gap-3 p-4 text-sm text-gray-400">
        <TriangleAlert className="h-5 w-5 shrink-0 text-amber-400" />
        <span className="flex-1">
          {this.props.title ? `${this.props.title}: ` : ''}
          {message}
        </span>
        <button className="btn-ghost px-2 py-1 text-xs" onClick={() => window.location.reload()}>
          <RefreshCw className="h-3.5 w-3.5" /> Reload
        </button>
      </div>
    )
  }
}
