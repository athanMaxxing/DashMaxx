import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Gamepad2, LogIn, UserPlus } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

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
          // The `handle_new_user` trigger reads raw_user_meta_data->>'username'.
          options: { data: { username: name } },
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
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600">
            <Gamepad2 className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">DashMaxx</h1>
          <p className="text-sm text-gray-400">The squad's command center.</p>
        </div>

        {!isSupabaseConfigured && (
          <p className="mb-4 rounded-md border border-yellow-700 bg-yellow-950/50 p-3 text-sm text-yellow-300">
            Supabase isn&apos;t configured. Fill in <code>.env.local</code> and restart the dev server.
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-gray-800 bg-gray-900/60 p-6 shadow-xl"
        >
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-gray-950 p-1">
            {['login', 'signup'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m)
                  setError('')
                }}
                className={`rounded-md py-1.5 text-sm font-medium transition ${
                  mode === m ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {m === 'login' ? 'Log in' : 'Sign up'}
              </button>
            ))}
          </div>

          {isSignup && (
            <label className="block space-y-1">
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

          <label className="block space-y-1">
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

          <label className="block space-y-1">
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

          {error && <p className="text-sm text-red-400">{error}</p>}
          {notice && <p className="text-sm text-green-400">{notice}</p>}

          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {isSignup ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            {busy ? 'Please wait…' : isSignup ? 'Create account' : 'Log in'}
          </button>
        </form>
      </div>
    </div>
  )
}
