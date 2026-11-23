import { Outlet } from 'react-router-dom'
import StatusMenu from './StatusMenu'

export default function DashboardLayout() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-gray-950/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-2.5">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="DashMaxx" className="h-9 w-9 rounded-full" />
            <span className="hidden font-display text-2xl font-extrabold uppercase italic tracking-tight min-[380px]:inline">
              Dash<span className="text-indigo-400">Maxx</span>
            </span>
          </div>
          <StatusMenu />
        </div>
      </header>
      <main className="mx-auto max-w-screen-2xl px-3 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 sm:px-4 sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pt-6">
        <Outlet />
      </main>
    </div>
  )
}
