import { Outlet } from 'react-router-dom'
import { Gamepad2, LogOut, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function DashboardLayout() {
  const { username, signOut } = useAuth()

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-950/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Gamepad2 className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">DashMaxx</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm text-gray-300">
              <User className="h-4 w-4 text-gray-500" />
              <span className="max-w-[10rem] truncate">{username}</span>
            </span>
            <button onClick={signOut} className="btn-ghost py-1.5">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-screen-2xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
