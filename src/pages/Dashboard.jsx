import { lazy, Suspense, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Car, Crosshair, Gamepad2, Home, LayoutGrid, Swords, Trophy, User, Users } from 'lucide-react'
import { SquadDataProvider } from '../context/SquadDataContext'
import { FortniteDataProvider } from '../context/FortniteDataContext'
import { RocketLeagueDataProvider } from '../context/RocketLeagueDataContext'
import { useGadgetPrefs } from '../lib/useGadgetPrefs'
import { AccentContext, ACCENTS, CardSkeleton } from '../components/GadgetCard'
import OwFilterBar from '../components/OwFilterBar'
import FnFilterBar from '../components/FnFilterBar'
import RlFilterBar from '../components/RlFilterBar'
import ErrorBoundary from '../components/ErrorBoundary'
import MePage from './MePage'

/*
 * Every gadget is loaded on demand (its own JS chunk), so the first screen
 * downloads only what's visible.
 */
const g = (load, name = 'default') => lazy(() => load().then((m) => ({ default: m[name] })))

const TonightHero = g(() => import('../components/gadgets/Heroes'), 'TonightHero')
const OwHero = g(() => import('../components/gadgets/Heroes'), 'OwHero')
const FnHero = g(() => import('../components/gadgets/Heroes'), 'FnHero')
const RlHero = g(() => import('../components/gadgets/Heroes'), 'RlHero')
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
 * Gadget registry. `id`s are what get saved in each user's hidden/pinned lists,
 * so don't rename them once people have customised their board.
 * `game: true` sections live under the Games tab, behind a switcher.
 * `bare` gadgets are the big scoreboard panels: they can't be pinned elsewhere.
 */
const SECTIONS = [
  {
    id: 'home',
    title: 'Tonight',
    subtitle: 'What’s happening in the squad',
    icon: Home,
    accent: 'indigo',
    gadgets: [
      { id: 'tonight-hero', title: 'Tonight scoreboard', Component: TonightHero, span: FULL, bare: true },
      { id: 'event', title: 'Event Countdown', Component: EventCountdown, span: FULL },
      { id: 'home-tonight', title: 'Who’s on', Component: HomeTonight },
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
    game: true,
    icon: Swords,
    accent: 'orange',
    actions: <OwFilterBar />,
    gadgets: [
      { id: 'ow-hero', title: 'This week', Component: OwHero, span: FULL, bare: true },
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
    game: true,
    icon: Crosshair,
    accent: 'yellow',
    actions: <FnFilterBar />,
    gadgets: [
      { id: 'fn-hero', title: 'Victory Royales', Component: FnHero, span: FULL, bare: true },
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
    game: true,
    icon: Car,
    accent: 'sky',
    actions: <RlFilterBar />,
    gadgets: [
      { id: 'rl-hero', title: 'Your rank', Component: RlHero, span: FULL, bare: true },
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
    icon: Trophy,
    accent: 'indigo',
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
    s.gadgets.filter((x) => !x.bare).map((x) => [x.id, { ...x, id: `pin-${x.id}`, accent: s.accent }]),
  ),
)

const GAME_IDS = SECTIONS.filter((s) => s.game).map((s) => s.id)
const LAST_GAME_KEY = 'dashmaxx:last-game'

function readLastGame() {
  try {
    return localStorage.getItem(LAST_GAME_KEY)
  } catch {
    return null
  }
}

function SectionHeader({ section }) {
  const accent = ACCENTS[section.accent]
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div>
        <h2 className="font-display text-3xl font-extrabold uppercase italic leading-none tracking-tight text-gray-100 sm:text-4xl">
          <span className={`mr-1.5 not-italic ${accent.text}`}>//</span>
          {section.title}
        </h2>
        {section.subtitle && <p className="mt-1 text-xs text-gray-500">{section.subtitle}</p>}
      </div>
      {section.actions}
    </div>
  )
}

function GameSwitcher({ games, active, onPick }) {
  return (
    <nav aria-label="Game" className="flex gap-1">
      {games.map((s) => {
        const on = s.id === active
        const accent = ACCENTS[s.accent]
        return (
          <button
            key={s.id}
            onClick={() => onPick(s.id)}
            aria-current={on ? 'page' : undefined}
            className={`para flex h-10 flex-1 items-center justify-center gap-1.5 px-3 font-display text-sm font-extrabold uppercase tracking-wider transition sm:flex-none sm:px-6 ${
              on ? 'text-gray-950' : 'bg-white/[0.05] text-gray-400 hover:bg-white/[0.1] hover:text-gray-200'
            }`}
            style={on ? { background: accent.hex } : undefined}
          >
            <s.icon className="h-4 w-4" />
            <span className="sm:hidden">{s.short}</span>
            <span className="hidden sm:inline">{s.title}</span>
          </button>
        )
      })}
    </nav>
  )
}

function Section({ section, gadgets, header = true }) {
  return (
    <AccentContext.Provider value={section.accent}>
      <section className="space-y-4">
        {header && <SectionHeader section={section} />}
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
  const prefs = useGadgetPrefs()
  const { isVisible, setVisible, pins } = prefs
  const [params, setParams] = useSearchParams()

  // Cards pinned to Home from other tabs, in the order the user chose.
  const pinned = pins.map((id) => PINNABLE.get(id)).filter(Boolean)
  const sections = SECTIONS.map((s) => {
    const shown = s.gadgets.filter((x) => isVisible(x.id))
    if (s.id !== 'home' || pinned.length === 0) return { ...s, shown }
    // Pins go right under the Tonight scoreboard and Event Countdown.
    let at = 0
    while (at < shown.length && ['tonight-hero', 'event'].includes(shown[at].id)) at += 1
    return { ...s, shown: [...shown.slice(0, at), ...pinned, ...shown.slice(at)] }
  }).filter((s) => s.shown.length > 0)
  const games = sections.filter((s) => s.game)

  const tabs = [
    sections.some((s) => s.id === 'home') && { id: 'home', title: 'Tonight', icon: Home },
    sections.some((s) => s.id === 'squad') && { id: 'squad', title: 'Squad', icon: Users },
    games.length > 0 && { id: 'games', title: 'Games', icon: Gamepad2 },
    sections.some((s) => s.id === 'boards') && { id: 'boards', title: 'Boards', icon: Trophy },
    { id: 'me', title: 'Me', icon: User },
  ].filter(Boolean)

  // Old links (?tab=overwatch, ?tab=admin) still land in the right place.
  let requested = params.get('tab') ?? tabs[0].id
  let requestedGame = params.get('game')
  let view = params.get('view')
  if (GAME_IDS.includes(requested)) {
    requestedGame = requested
    requested = 'games'
  }
  if (requested === 'admin') {
    requested = 'me'
    view = 'admin'
  }
  const active = tabs.some((t) => t.id === requested) ? requested : tabs[0].id
  const remembered = readLastGame()
  const game =
    games.find((s) => s.id === requestedGame)?.id ?? games.find((s) => s.id === remembered)?.id ?? games[0]?.id

  const go = (next) => {
    const clean = Object.fromEntries(Object.entries(next).filter(([, v]) => v))
    setParams(clean, { replace: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const setTab = (id) => go(id === tabs[0].id ? {} : { tab: id, game: id === 'games' ? game : null })
  const setGame = (id) => {
    try {
      localStorage.setItem(LAST_GAME_KEY, id)
    } catch {
      /* private mode: just don't remember */
    }
    go({ tab: 'games', game: id })
  }
  const setView = (v) => go({ tab: 'me', view: v })

  // On phones the tab bar scrolls sideways: keep the active tab visible.
  useEffect(() => {
    document.querySelector(`[data-tab="${active}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [active])

  const section = active === 'games' ? games.find((s) => s.id === game) : sections.find((s) => s.id === active)

  return (
    <SquadDataProvider>
      <FortniteDataProvider>
        <RocketLeagueDataProvider>
          <div className="space-y-6">
            {/* Tab bar (tablet and up) */}
            <div className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-10 -mx-4 hidden border-b border-white/[0.06] bg-gray-950/85 px-4 py-2 backdrop-blur-xl sm:block">
              <nav className="flex gap-1.5" aria-label="Sections">
                {tabs.map((t) => {
                  const on = t.id === active
                  return (
                    <button
                      key={t.id}
                      data-tab={t.id}
                      onClick={() => setTab(t.id)}
                      aria-current={on ? 'page' : undefined}
                      className={`para flex h-10 items-center gap-2 px-6 font-display text-sm font-extrabold uppercase tracking-wider transition ${
                        on ? 'bg-indigo-400 text-gray-950' : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.09] hover:text-gray-200'
                      }`}
                    >
                      <t.icon className="h-4 w-4" />
                      {t.title}
                    </button>
                  )
                })}
              </nav>
            </div>

            {/* Phones: tab bar pinned to the bottom, within thumb reach. */}
            <nav
              className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.08] bg-gray-950/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl sm:hidden"
              aria-label="Sections"
            >
              <div className="flex gap-1">
                {tabs.map((t) => {
                  const on = t.id === active
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      aria-current={on ? 'page' : undefined}
                      className={`para flex h-12 min-w-0 flex-col items-center justify-center gap-0.5 font-display text-[11px] font-extrabold uppercase tracking-wider transition ${
                        on ? 'flex-[1.35] bg-indigo-400 text-gray-950' : 'flex-1 bg-white/[0.04] text-gray-400 active:bg-white/[0.1]'
                      }`}
                    >
                      <t.icon className="h-[18px] w-[18px]" />
                      <span className="max-w-full truncate px-1">{t.title}</span>
                    </button>
                  )
                })}
              </div>
            </nav>

            {prefs.error && active !== 'me' && <p className="text-sm text-rose-400">Couldn&apos;t save gadget settings: {prefs.error}</p>}

            {active === 'me' ? (
              <MePage sections={SECTIONS} prefs={prefs} view={view} setView={setView} />
            ) : !section ? (
              <div className="flex flex-col items-center gap-3 py-20 text-center text-gray-500">
                <LayoutGrid className="h-10 w-10" />
                <p>All gadgets are hidden.</p>
                <button className="btn-primary" onClick={() => setVisible(SECTIONS.flatMap((s) => s.gadgets.map((x) => x.id)), true)}>
                  Show everything
                </button>
              </div>
            ) : active === 'games' ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <GameSwitcher games={games} active={game} onPick={setGame} />
                  {section.actions}
                </div>
                <Section key={section.id} section={section} gadgets={section.shown} header={false} />
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
