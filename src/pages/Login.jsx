import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Crosshair, Gamepad2, LogIn, Swords, Trophy, UserPlus } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

const FEATURES = [
  { icon: Swords, text: 'Overwatch match tracking & leaderboards' },
  { icon: Crosshair, text: 'Fortnite wins, kills & sprite checklist' },
  { icon: CalendarDays, text: 'Who’s on tonight, schedules & chat' },
  { icon: Trophy, text: 'Bounties, squad goals & the quote wall' },
]

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const isSignup = mode === 'signup'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)
    try {
      if (isSignup) {
        const name = username.trim()
        if (!name) throw new Error('Pick a username.')
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // The `handle_new_user` trigger reads raw_user_meta_data->>'username'.
            data: { username: name },
            // Send the confirmation link back to this app (e.g. .../DashMaxx/), not the bare domain.
            emailRedirectTo: window.location.origin + import.meta.env.BASE_URL,
          },
        })
        if (err) throw err
        if (!data.session) {
          setNotice('Account created. Check your email to confirm, then log in.')
          setMode('login')
          return
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
      }
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message ?? 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-4xl items-center gap-10 md:grid-cols-2">
        <div className="hidden md:block">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 shadow-glow">
            <Gamepad2 className="h-7 w-7 text-white" />
          </div>
          <h1 className="font-display text-5xl font-bold leading-tight tracking-tight">
            Dash
            <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">Maxx</span>
          </h1>
          <p className="mt-3 text-lg text-gray-400">The squad&apos;s command center.</p>
          <ul className="mt-8 space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-gray-300">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] ring-1 ring-white/10">
                  <Icon className="h-4 w-4 text-indigo-300" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-2 text-center md:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 shadow-glow">
              <Gamepad2 className="h-6 w-6 text-white" />
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight">DashMaxx</h1>
            <p className="text-sm text-gray-400">The squad&apos;s command center.</p>
          </div>

          {!isSupabaseConfigured && (
            <p className="mb-4 rounded-lg border border-yellow-700 bg-yellow-950/50 p-3 text-sm text-yellow-300">
              Supabase isn&apos;t configured. Fill in <code>.env.local</code> and restart the dev server.
            </p>
          )}

          <form onSubmit={handleSubmit} className="card space-y-4 p-6">
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-950/80 p-1 ring-1 ring-white/5">
              {['login', 'signup'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m)
                    setError('')
                  }}
                  className={`rounded-lg py-2 text-sm font-medium transition ${
                    mode === m ? 'bg-white/10 text-white shadow' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {m === 'login' ? 'Log in' : 'Sign up'}
                </button>
              ))}
            </div>

            {isSignup && (
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-gray-400">Username</span>
                <input
                  className="input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="GenjiMain42"
                  autoComplete="username"
                  required
                />
              </label>
            )}

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-gray-400">Email</span>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-gray-400">Password</span>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                minLength={6}
                required
              />
            </label>

            {error && <p className="text-sm text-rose-400">{error}</p>}
            {notice && <p className="text-sm text-emerald-400">{notice}</p>}

            <button type="submit" className="btn-primary w-full py-2.5" disabled={busy}>
              {isSignup ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
              {busy ? 'Please wait…' : isSignup ? 'Create account' : 'Log in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
