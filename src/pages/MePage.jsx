import { lazy, Suspense, useState } from 'react'
import { ChevronLeft, ChevronRight, LayoutGrid, LogOut, Pencil, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/Avatar'
import { CardSkeleton } from '../components/GadgetCard'
import GadgetCustomizer from '../components/GadgetCustomizer'
import ErrorBoundary from '../components/ErrorBoundary'
import InstallApp from '../components/InstallApp'
import ProfileSettings from '../components/ProfileSettings'
import PushToggle from '../components/PushToggle'
import { StatusPicker, useMyStatus } from '../components/StatusPicker'
import { HeroPanel } from '../components/Hud'

const AdminPanel = lazy(() => import('./AdminPanel'))

const ROW = 'para flex min-h-[48px] w-full items-center gap-3 bg-white/[0.04] pl-4 pr-5 text-[15px] text-gray-100 transition hover:bg-white/[0.08]'

function SubHeader({ title, onBack }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <button className="btn-ghost px-3" onClick={onBack} aria-label="Back to Me">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <h2 className="font-display text-2xl font-extrabold uppercase italic">{title}</h2>
    </div>
  )
}

/**
 * The Me tab: profile, status and every setting. `view` opens Customize or
 * Admin full-width; `prefs` is the gadget settings hook from the dashboard.
 */
export default function MePage({ sections, prefs, view, setView }) {
  const { username, profile, signOut } = useAuth()
  const isAdmin = Boolean(profile?.is_admin)
  const my = useMyStatus()
  const [editing, setEditing] = useState(false)

  if (view === 'customize') {
    return (
      <div className="animate-fade-up">
        <SubHeader title="Customize" onBack={() => setView(null)} />
        <GadgetCustomizer sections={sections} {...prefs} onClose={() => setView(null)} />
      </div>
    )
  }
  if (view === 'admin' && isAdmin) {
    return (
      <div className="animate-fade-up">
        <SubHeader title="Admin" onBack={() => setView(null)} />
        <ErrorBoundary title="Admin">
          <Suspense fallback={<CardSkeleton />}>
            <AdminPanel />
          </Suspense>
        </ErrorBoundary>
      </div>
    )
  }

  const pins = prefs.pins.length

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <HeroPanel color="#f0abfc" deep="#701a75">
        <div className="flex items-center gap-4">
          <Avatar profile={profile ?? { username }} size="xl" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-4xl font-extrabold uppercase italic leading-none">{username}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-indigo-100">
              {isAdmin && <ShieldCheck className="h-4 w-4 text-rose-300" />}
              {isAdmin ? 'Admin' : 'Squad member'}
              {my.status && ` · ${my.status.label}`}
            </p>
          </div>
          <button className="btn-ghost shrink-0 bg-black/30" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        </div>
      </HeroPanel>

      <section className="space-y-2">
        <p className="lbl">
          <span className="text-indigo-400">//</span> Your status
        </p>
        <StatusPicker my={my} />
      </section>

      <section className="space-y-1.5">
        <p className="lbl mb-2">
          <span className="text-indigo-400">//</span> Settings
        </p>
        <button className={ROW} onClick={() => setView('customize')}>
          <LayoutGrid className="h-[18px] w-[18px] text-indigo-400" />
          <span className="flex-1 text-left">Customize Home &amp; tabs</span>
          {pins > 0 && <span className="lbl tracking-[0.08em]">{pins} pinned</span>}
          <ChevronRight className="h-4 w-4 text-gray-500" />
        </button>
        <PushToggle />
        <InstallApp row={ROW} />
        {isAdmin && (
          <button className={ROW} onClick={() => setView('admin')}>
            <ShieldCheck className="h-[18px] w-[18px] text-rose-300" />
            <span className="flex-1 text-left">Admin panel</span>
            <ChevronRight className="h-4 w-4 text-gray-500" />
          </button>
        )}
        <button className={`${ROW} text-rose-300`} onClick={signOut}>
          <LogOut className="h-[18px] w-[18px]" />
          <span className="flex-1 text-left">Log out</span>
        </button>
      </section>

      {editing && <ProfileSettings onClose={() => setEditing(false)} />}
    </div>
  )
}
