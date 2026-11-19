import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Crosshair, Gamepad, LayoutDashboard, LayoutGrid, Settings2, ShieldCheck, Swords, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { SquadDataProvider } from '../context/SquadDataContext'
import { FortniteDataProvider } from '../context/FortniteDataContext'
import { useGadgetPrefs } from '../lib/useGadgetPrefs'
import { AccentContext, ACCENTS } from '../components/GadgetCard'
import GadgetCustomizer from '../components/GadgetCustomizer'
import OwFilterBar from '../components/OwFilterBar'
import FnFilterBar from '../components/FnFilterBar'
import AdminPanel from './AdminPanel'
import BountyBoard from '../components/gadgets/BountyBoard'
import DuoSynergy from '../components/gadgets/DuoSynergy'
import FnLeaderboard from '../components/gadgets/FnLeaderboard'
import FnMatchTracker from '../components/gadgets/FnMatchTracker'
import FnRecords from '../components/gadgets/FnRecords'
import FnSessionRecap from '../components/gadgets/FnSessionRecap'
import HeroPool from '../components/gadgets/HeroPool'
import OverwatchTracker from '../components/gadgets/OverwatchTracker'
import QuoteWall from '../components/gadgets/QuoteWall'
import ReadyCheck from '../components/gadgets/ReadyCheck'
import ScheduleMatrix from '../components/gadgets/ScheduleMatrix'
import SessionRecap from '../components/gadgets/SessionRecap'
import Shoutbox from '../components/gadgets/Shoutbox'
import SpriteChecklist from '../components/gadgets/SpriteChecklist'
import SquadGoals from '../components/gadgets/SquadGoals'
import SquadLeaderboard from '../components/gadgets/SquadLeaderboard'
import StreaksRecords from '../components/gadgets/StreaksRecords'

// 1 column on mobile, 2 on large, 3 on extra-large.
const GRID = 'grid grid-cols-1 items-start gap-5 lg:grid-cols-2 xl:grid-cols-3'

/*
 * Gadget registry. `id`s are what get saved in each user's hidden list,
 * so don't rename them once people have customised their board.
 */
const SECTIONS = [
  {
    id: 'squad',
    title: 'Squad',
    subtitle: 'Who’s on, when, and what they’re saying',
    icon: Users,
    accent: 'emerald',
    gadgets: [
      { id: 'ready-check', title: 'Ready Check', Component: ReadyCheck },
      { id: 'schedule', title: 'Scheduling Matrix', Component: ScheduleMatrix },
      { id: 'shoutbox', title: 'Shoutbox', Component: Shoutbox, span: 'lg:col-span-2 xl:col-span-1' },
    ],
  },
  {
    id: 'overwatch',
    title: 'Overwatch',
    short: 'OW',
    subtitle: 'Matches, heroes, duos and records',
    icon: Swords,
    accent: 'orange',
    actions: <OwFilterBar />,
    gadgets: [
      { id: 'ow-tracker', title: 'Match Tracker', Component: OverwatchTracker },
      { id: 'ow-leaderboard', title: 'Squad Leaderboard', Component: SquadLeaderboard, span: 'xl:col-span-2' },
      { id: 'ow-session', title: 'Session Recap', Component: SessionRecap },
      { id: 'ow-heroes', title: 'Hero Pool', Component: HeroPool },
      { id: 'ow-records', title: 'Streaks & Records', Component: StreaksRecords },
      { id: 'ow-duos', title: 'Duo Synergy', Component: DuoSynergy },
    ],
  },
  {
    id: 'fortnite',
    title: 'Fortnite',
    short: 'FN',
    subtitle: 'Victory Royales, kills and sprites',
    icon: Crosshair,
    accent: 'violet',
    actions: <FnFilterBar />,
    gadgets: [
      { id: 'fn-tracker', title: 'Match Tracker', Component: FnMatchTracker },
      { id: 'fn-leaderboard', title: 'Fortnite Leaderboard', Component: FnLeaderboard, span: 'xl:col-span-2' },
      { id: 'fn-session', title: 'Session Recap', Component: FnSessionRecap },
      { id: 'fn-records', title: 'Records', Component: FnRecords },
      { id: 'sprites', title: 'Sprite Checklist', Component: SpriteChecklist },
    ],
  },
  {
    id: 'boards',
    title: 'Boards',
    subtitle: 'Bounties, goals and the hall of quotes',
    icon: Gamepad,
    accent: 'amber',
    gadgets: [
      { id: 'quotes', title: 'Quote Wall', Component: QuoteWall, span: 'lg:col-span-2' },
      { id: 'bounties', title: 'Bounty Board', Component: BountyBoard },
      { id: 'goals', title: 'Squad Goals', Component: SquadGoals },
    ],
  },
]

function SectionHeader({ section }) {
  const accent = ACCENTS[section.accent]
  const Icon = section.icon
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${accent.chip}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className={`bg-gradient-to-r bg-clip-text font-display text-2xl font-bold tracking-tight text-transparent ${accent.title}`}>
            {section.title}
          </h2>
          {section.subtitle && <p className="text-xs text-gray-500">{section.subtitle}</p>}
        </div>
      </div>
      {section.actions}
    </div>
  )
}

function Section({ section, gadgets }) {
  return (
    <AccentContext.Provider value={section.accent}>
      <section className="space-y-4">
        <SectionHeader section={section} />
        <div className={GRID}>
          {gadgets.map(({ id, Component, span }) => (
            <div key={id} className={`min-w-0 ${span ?? ''}`}>
              <Component />
            </div>
          ))}
        </div>
      </section>
    </AccentContext.Provider>
  )
}

export default function Dashboard() {
  const { profile } = useAuth()
  const isAdmin = Boolean(profile?.is_admin)
  const { isVisible, setVisible, error } = useGadgetPrefs()
  const [customizing, setCustomizing] = useState(false)
  const [params, setParams] = useSearchParams()

  const sections = SECTIONS.map((s) => ({ ...s, shown: s.gadgets.filter((g) => isVisible(g.id)) })).filter(
    (s) => s.shown.length > 0,
  )

  const tabs = [
    { id: 'all', title: 'Overview', icon: LayoutDashboard, accent: 'indigo' },
    ...sections.map((s) => ({ id: s.id, title: s.title, icon: s.icon, accent: s.accent })),
    ...(isAdmin ? [{ id: 'admin', title: 'Admin', icon: ShieldCheck, accent: 'rose' }] : []),
  ]
  const requested = params.get('tab') ?? 'all'
  const active = tabs.some((t) => t.id === requested) ? requested : 'all'
  const setTab = (id) => setParams(id === 'all' ? {} : { tab: id }, { replace: true })

  const showing = active === 'all' ? sections : sections.filter((s) => s.id === active)

  return (
    <SquadDataProvider>
      <FortniteDataProvider>
        <div className="space-y-6">
          {/* Tab bar */}
          <div className="sticky top-16 z-10 -mx-4 border-b border-white/[0.06] bg-gray-950/70 px-4 py-2 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
                {tabs.map((t) => {
                  const Icon = t.icon
                  const on = t.id === active
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                        on ? `ring-1 ${ACCENTS[t.accent].tab}` : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {t.title}
                    </button>
                  )
                })}
              </nav>
              <button
                className={`btn-ghost shrink-0 py-1.5 text-xs ${customizing ? 'border-indigo-400/50 text-indigo-200' : ''}`}
                onClick={() => setCustomizing((v) => !v)}
              >
                <Settings2 className="h-4 w-4" />
                <span className="hidden sm:inline">Customize</span>
              </button>
            </div>
          </div>

          {customizing && (
            <GadgetCustomizer
              sections={SECTIONS}
              isVisible={isVisible}
              setVisible={setVisible}
              onClose={() => setCustomizing(false)}
              error={error}
            />
          )}
          {!customizing && error && <p className="text-sm text-rose-400">Couldn&apos;t save gadget settings: {error}</p>}

          {active === 'admin' ? (
            <AccentContext.Provider value="rose">
              <AdminPanel />
            </AccentContext.Provider>
          ) : showing.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center text-gray-500">
              <LayoutGrid className="h-10 w-10" />
              <p>All gadgets are hidden.</p>
              <button
                className="btn-primary"
                onClick={() => setVisible(SECTIONS.flatMap((s) => s.gadgets.map((g) => g.id)), true)}
              >
                Show everything
              </button>
            </div>
          ) : (
            <div className="space-y-12">
              {showing.map((s) => (
                <Section key={s.id} section={s} gadgets={s.shown} />
              ))}
            </div>
          )}
        </div>
      </FortniteDataProvider>
    </SquadDataProvider>
  )
}
