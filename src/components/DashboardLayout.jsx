import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Gamepad2, LogOut, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Avatar from './Avatar'
import ProfileSettings from './ProfileSettings'

export default function DashboardLayout() {
  const { username, profile, signOut } = useAuth()
  const [editingProfile, setEditingProfile] = useState(false)

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-gray-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 shadow-glow">
              <Gamepad2 className="h-5 w-5 text-white" />
            </div>
            <span className="hidden font-display text-xl font-bold tracking-tight min-[400px]:inline">
              Dash<span className="bg-gradient-to-r from-indigo-300 to-fuchsia-300 bg-clip-text text-transparent">Maxx</span>
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              onClick={() => setEditingProfile(true)}
              className="flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1 pl-1 pr-3 transition hover:border-white/20 hover:bg-white/[0.06]"
              title="Edit your profile"
            >
              <Avatar profile={profile ?? { username }} size="md" />
              <span className="max-w-[7rem] truncate text-sm font-medium text-gray-200 sm:max-w-[10rem]">{username}</span>
              {profile?.is_admin && <ShieldCheck className="h-4 w-4 shrink-0 text-rose-300" aria-label="Admin" />}
            </button>
            <button onClick={signOut} className="btn-ghost shrink-0 py-1.5" title="Log out">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-screen-2xl px-3 py-5 sm:px-4 sm:py-6">
        <Outlet />
      </main>
      {editingProfile && <ProfileSettings onClose={() => setEditingProfile(false)} />}
    </div>
  )
}
