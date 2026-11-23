import { lazy, Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Car, Crosshair, Gamepad, Home, LayoutGrid, Settings2, ShieldCheck, Swords, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { SquadDataProvider } from '../context/SquadDataContext'
import { FortniteDataProvider } from '../context/FortniteDataContext'
import { RocketLeagueDataProvider } from '../context/RocketLeagueDataContext'
import { useGadgetPrefs } from '../lib/useGadgetPrefs'
import { AccentContext, ACCENTS, CardSkeleton } from '../components/GadgetCard'
import GadgetCustomizer from '../components/GadgetCustomizer'
import OwFilterBar from '../components/OwFilterBar'
import FnFilterBar from '../components/FnFilterBar'
import RlFilterBar from '../components/RlFilterBar'
import ErrorBoundary from '../components/ErrorBoundary'

/*
 * Every gadget is loaded on demand (its own JS chunk), so the first screen
 * downloads only what's visible.
 */
const g = (load, name = 'default') => lazy(() => load().then((m) => ({ default: m[name] })))

const AdminPanel = g(() => import('./AdminPanel'))
const EventCountdown = g(() => import('../components/gadgets/EventCountdown'))
const HomeTonight = g(() => import('../components/gadgets/HomeCards'), 'HomeTonight')
const HomeLastSessions = g(() => import('../components/gadgets/HomeCards'), 'HomeLastSessions')
const HomeQuote = g(() => import('../components/gadgets/HomeCards'), 'HomeQuote')
const HomeTodo = g(() => import('../components/gadgets/HomeCards'), 'HomeTodo')
const ReadyCheck = g(() => import('../components/gadgets/ReadyCheck'))
const ScheduleMatrix = g(() => import('../components/gadgets/ScheduleMatrix'))
const Shoutbox = g(() => import('../components/gadgets/Shoutbox'))
const OverwatchTracker = g(() => import('../components/gadgets/OverwatchTracker'))
const SquadLeaderboard = g(() => import('../components/gadgets/SquadLeaderboard'))
const SessionRecap = g(() => import('../components/gadgets/SessionRecap'))
const HeroPool = g(() => import('../components/gadgets/HeroPool'))
const StreaksRecords = g(() => import('../components/gadgets/StreaksRecords'))
const DuoSynergy = g(() => import('../components/gadgets/DuoSynergy'))
const FnMatchTracker = g(() => import('../components/gadgets/FnMatchTracker'))
const FnLeaderboard = g(() => import('../components/gadgets/FnLeaderboard'))
const FnSessionRecap = g(() => import('../components/gadgets/FnSessionRecap'))
const FnRecords = g(() => import('../components/gadgets/FnRecords'))
const ShopTimer = g(() => import('../components/gadgets/ShopTimer'))
const SpriteChecklist = g(() => import('../components/gadgets/SpriteChecklist'))
const RlMatchTracker = g(() => import('../components/gadgets/RlMatchTracker'))
const RlRankProgress = g(() => import('../components/gadgets/RlRankProgress'))
const RlLeaderboard = g(() => import('../components/gadgets/RlLeaderboard'))
const RlSessionRecap = g(() => import('../components/gadgets/RlSessionRecap'))
const RlRecords = g(() => import('../components/gadgets/RlRecords'))
const QuoteWall = g(() => import('../components/gadgets/QuoteWall'))
const BountyBoard = g(() => import('../components/gadgets/BountyBoard'))
const SquadGoals = g(() => import('../components/gadgets/SquadGoals'))
const Achievements = g(() => import('../components/gadgets/Achievements'))

// 1 column on mobile, 2 on large, 3 on extra-large.
const GRID = 'grid grid-cols-1 items-start gap-4 sm:gap-5 lg:grid-cols-2 xl:grid-cols-3'
const FULL = 'lg:col-span-2 xl:col-span-3'

/*
 * Gadget registry. `id`s are what get saved in each user's hidden list,
 * so don't rename them once people have customised their board.
 */
const SECTIONS = [
  {
    id: 'home',
    title: 'Home',
    subtitle: 'What’s happening in the squad',
    icon: Home,
    accent: 'indigo',
    gadgets: [
      { id: 'event', title: 'Event Countdown', Component: EventCountdown, span: FULL },
      { id: 'home-tonight', title: 'Tonight', Component: HomeTonight },
      { id: 'home-last', title: 'Last sessions', Component: HomeLastSessions },
      { id: 'home-quote', title: 'Quote of the day', Component: HomeQuote },
      { id: 'home-todo', title: 'Up for grabs', Component: HomeTodo, span: 'xl:col-span-3 lg:col-span-2' },
    ],
  },
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
      { id: 'fn-shop', title: 'Item Shop Refresh', Component: ShopTimer },
      { id: 'sprites', title: 'Sprite Checklist', Component: SpriteChecklist },
    ],
  },
  {
    id: 'rocketleague',
    title: 'Rocket League',
    short: 'RL',
    subtitle: 'Ranked climbs, goals, saves and MVPs',
    icon: Car,
    accent: 'sky',
    actions: <RlFilterBar />,
    gadgets: [
      { id: 'rl-tracker', title: 'Match Tracker', Component: RlMatchTracker },
      { id: 'rl-rank', title: 'Rank Progression', Component: RlRankProgress, span: 'xl:col-span-2' },
      { id: 'rl-leaderboard', title: 'Rocket League Leaderboard', Component: RlLeaderboard, span: 'xl:col-span-2' },
      { id: 'rl-session', title: 'Session Recap', Component: RlSessionRecap },
      { id: 'rl-records', title: 'Records', Component: RlRecords },
    ],
  },
  {
    id: 'boards',
    title: 'Boards',
    subtitle: 'Bounties, goals, quotes and bragging rights',
    icon: Gamepad,
    accent: 'amber',
    gadgets: [
      { id: 'quotes', title: 'Quote Wall', Component: QuoteWall, span: 'lg:col-span-2' },
      { id: 'bounties', title: 'Bounty Board', Component: BountyBoard },
      { id: 'goals', title: 'Squad Goals', Component: SquadGoals },
      { id: 'achievements', title: 'Achievements', Component: Achievements, span: 'lg:col-span-2' },
    ],
  },
]

/** Gadgets from every tab except Home, which can be pinned to Home. id -> gadget (+ its tab's accent). */
const PINNABLE = new Map(
  SECTIONS.filter((s) => s.id !== 'home').flatMap((s) =>
    s.gadgets.map((x) => [x.id, { ...x, id: `pin-${x.id}`, accent: s.accent, sectionTitle: s.title }]),
  ),
)

function SectionHeader({ section }) {
  const accent = ACCENTS[section.accent]
  const Icon = section.icon
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
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
          {gadgets.map(({ id, title, Component, span, accent }) => {
            const card = (
              <div key={id} className={`min-w-0 ${span ?? ''}`}>
                <ErrorBoundary title={title}>
                  <Suspense fallback={<CardSkeleton />}>
                    <Component />
                  </Suspense>
                </ErrorBoundary>
              </div>
            )
            // Cards pinned from another tab keep that tab's colour.
            return accent ? (
              <AccentContext.Provider key={id} value={accent}>
                {card}
              </AccentContext.Provider>
            ) : (
              card
            )
          })}
        </div>
      </section>
    </AccentContext.Provider>
  )
}

export default function Dashboard() {
  const { profile } = useAuth()
  const isAdmin = Boolean(profile?.is_admin)
  const { isVisible, setVisible, pins, isPinned, togglePin, movePin, error } = useGadgetPrefs()
  const [customizing, setCustomizing] = useState(false)
  const [params, setParams] = useSearchParams()

  // Cards pinned to Home from other tabs, in the order the user chose.
  const pinned = pins.map((id) => PINNABLE.get(id)).filter(Boolean)

  const sections = SECTIONS.map((s) => {
    const shown = s.gadgets.filter((x) => isVisible(x.id))
    if (s.id !== 'home' || pinned.length === 0) return { ...s, shown }
    // Pins go right under the Event Countdown banner (or first if it's hidden).
    const at = shown[0]?.id === 'event' ? 1 : 0
    return { ...s, shown: [...shown.slice(0, at), ...pinned, ...shown.slice(at)] }
  }).filter((s) => s.shown.length > 0)

  const tabs = [
    ...sections.map((s) => ({ id: s.id, title: s.title, short: s.short, icon: s.icon, accent: s.accent })),
    ...(isAdmin ? [{ id: 'admin', title: 'Admin', icon: ShieldCheck, accent: 'rose' }] : []),
  ]
  const requested = params.get('tab') ?? tabs[0]?.id
  const active = tabs.some((t) => t.id === requested) ? requested : tabs[0]?.id
  const setTab = (id) => {
    setParams(id === tabs[0]?.id ? {} : { tab: id }, { replace: true })
    setCustomizing(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const section = sections.find((s) => s.id === active)

  // On phones the tab bar scrolls sideways: keep the active tab visible.
  useEffect(() => {
    document.querySelector(`[data-tab="${active}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [active])

  return (
    <SquadDataProvider>
      <FortniteDataProvider>
      <RocketLeagueDataProvider>
        <div className="space-y-6">
          {/* Tab bar */}
          <div className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-10 -mx-4 hidden border-b border-white/[0.06] bg-gray-950/70 px-4 py-2 backdrop-blur-xl sm:block">
            <div className="flex items-center gap-2">
              <nav className="-my-1 flex min-w-0 flex-1 gap-1 overflow-x-auto py-1 [scrollbar-width:none]">
                {tabs.map((t) => {
                  const Icon = t.icon
                  const on = t.id === active
                  return (
                    <button
                      key={t.id}
                      data-tab={t.id}
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
                className={`btn-ghost shrink-0 px-2 py-1.5 text-xs sm:px-3 ${customizing ? 'border-indigo-400/50 text-indigo-200' : ''}`}
                onClick={() => setCustomizing((v) => !v)}
                title="Choose your gadgets"
              >
                <Settings2 className="h-4 w-4" />
                <span className="hidden sm:inline">Customize</span>
              </button>
            </div>
          </div>

          {/* Phones: app-style tab bar pinned to the bottom, within thumb reach. */}
          <nav
            className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.08] bg-gray-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden"
            aria-label="Sections"
          >
            <div className="flex">
              {tabs.map((t) => {
                const Icon = t.icon
                const on = t.id === active
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    aria-current={on ? 'page' : undefined}
                    className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 pb-2 pt-2.5 text-[10px] font-medium transition ${
                      on ? ACCENTS[t.accent].text : 'text-gray-500 active:text-gray-300'
                    }`}
                  >
                    {on && <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-current" />}
                    <Icon className={`h-5 w-5 transition ${on ? 'scale-110' : ''}`} />
                    <span className="max-w-full truncate px-0.5">{t.short ?? t.title}</span>
                  </button>
                )
              })}
              <button
                onClick={() => {
                  setCustomizing((v) => !v)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 pb-2 pt-2.5 text-[10px] font-medium transition ${
                  customizing ? 'text-indigo-300' : 'text-gray-500 active:text-gray-300'
                }`}
              >
                <Settings2 className="h-5 w-5" />
                <span>Edit</span>
              </button>
            </div>
          </nav>

          {customizing && (
            <GadgetCustomizer
              sections={SECTIONS}
              isVisible={isVisible}
              setVisible={setVisible}
              pins={pins}
              isPinned={isPinned}
              togglePin={togglePin}
              movePin={movePin}
              onClose={() => setCustomizing(false)}
              error={error}
            />
          )}
          {!customizing && error && <p className="text-sm text-rose-400">Couldn&apos;t save gadget settings: {error}</p>}

          {active === 'admin' ? (
            <AccentContext.Provider value="rose">
              <ErrorBoundary title="Admin">
                <Suspense fallback={<CardSkeleton />}>
                  <AdminPanel />
                </Suspense>
              </ErrorBoundary>
            </AccentContext.Provider>
          ) : !section ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center text-gray-500">
              <LayoutGrid className="h-10 w-10" />
              <p>All gadgets are hidden.</p>
              <button
                className="btn-primary"
                onClick={() => setVisible(SECTIONS.flatMap((s) => s.gadgets.map((x) => x.id)), true)}
              >
                Show everything
              </button>
            </div>
          ) : (
            <Section key={section.id} section={section} gadgets={section.shown} />
          )}
        </div>
      </RocketLeagueDataProvider>
      </FortniteDataProvider>
    </SquadDataProvider>
  )
}
