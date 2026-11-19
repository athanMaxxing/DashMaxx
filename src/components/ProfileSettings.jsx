import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'
import Avatar, { AVATAR_COLORS, AVATAR_EMOJIS } from './Avatar'

/** Modal for changing your username, emoji avatar and colour. */
export default function ProfileSettings({ onClose }) {
  const { profile, updateProfile } = useAuth()
  const toast = useToast()
  const [username, setUsername] = useState(profile?.username ?? '')
  const [emoji, setEmoji] = useState(profile?.avatar_emoji ?? '')
  const [color, setColor] = useState(profile?.avatar_color ?? 'indigo')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Close on Escape.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const preview = { username: username || '?', avatar_emoji: emoji, avatar_color: color }

  async function save(e) {
    e.preventDefault()
    const name = username.trim()
    if (!name) return setError('Username can’t be empty.')
    if (name.length > 32) return setError('Keep it to 32 characters.')
    setSaving(true)
    setError('')
    try {
      await updateProfile({ username: name, avatar_emoji: emoji || null, avatar_color: color })
      toast.success('Profile saved')
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="card w-full max-w-md animate-fade-up space-y-5 p-5"
        role="dialog"
        aria-label="Profile settings"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Your profile</h2>
          <button type="button" className="btn-ghost p-1.5" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <Avatar profile={preview} size="lg" />
          <label className="block flex-1 space-y-1.5">
            <span className="text-xs font-medium text-gray-400">Username</span>
            <input className="input" value={username} maxLength={32} onChange={(e) => setUsername(e.target.value)} />
          </label>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-gray-400">Avatar</p>
          <div className="grid grid-cols-8 gap-1.5">
            <button
              type="button"
              onClick={() => setEmoji('')}
              className={`flex h-9 items-center justify-center rounded-lg text-xs font-bold ring-1 transition ${
                !emoji ? 'bg-indigo-500/20 ring-indigo-400/60' : 'ring-white/10 hover:bg-white/5'
              }`}
              title="Use your initial"
            >
              Aa
            </button>
            {AVATAR_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={`flex h-9 items-center justify-center rounded-lg text-lg ring-1 transition ${
                  emoji === e ? 'bg-indigo-500/20 ring-indigo-400/60' : 'ring-white/10 hover:bg-white/5'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-gray-400">Colour</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(AVATAR_COLORS).map(([key, cls]) => (
              <button
                key={key}
                type="button"
                onClick={() => setColor(key)}
                className={`h-8 w-8 rounded-full bg-gradient-to-br ${cls} transition ${
                  color === key ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : 'opacity-70 hover:opacity-100'
                }`}
                aria-label={key}
                title={key}
              />
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
