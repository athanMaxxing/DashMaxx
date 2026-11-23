import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import StatusMenu from './StatusMenu'
import ProfileSettings from './ProfileSettings'
import InstallApp from './InstallApp'

export default function DashboardLayout() {
  const { signOut } = useAuth()
  const [editingProfile, setEditingProfile] = useState(false)

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-gray-950/70 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-2.5">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="DashMaxx" className="h-9 w-9 rounded-full shadow-glow" />
            <span className="hidden font-display text-xl font-bold tracking-tight min-[400px]:inline">
              Dash<span className="bg-gradient-to-r from-indigo-300 to-fuchsia-300 bg-clip-text text-transparent">Maxx</span>
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <StatusMenu onEditProfile={() => setEditingProfile(true)} />
            <InstallApp />
            <button onClick={signOut} className="btn-ghost shrink-0 py-1.5" title="Log out">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-screen-2xl px-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-5 sm:px-4 sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pt-6">
        <Outlet />
      </main>
      {editingProfile && <ProfileSettings onClose={() => setEditingProfile(false)} />}
    </div>
  )
}
