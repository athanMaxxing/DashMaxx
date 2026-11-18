import { useState } from 'react'
import { Gamepad, LayoutGrid, Settings2, Swords, Users } from 'lucide-react'
import { SquadDataProvider } from '../context/SquadDataContext'
import { useGadgetPrefs } from '../lib/useGadgetPrefs'
import OwFilterBar from '../components/OwFilterBar'
import GadgetCustomizer, { GroupChips } from '../components/GadgetCustomizer'
import BountyBoard from '../components/gadgets/BountyBoard'
import DuoSynergy from '../components/gadgets/DuoSynergy'
import HeroPool from '../components/gadgets/HeroPool'
import OverwatchTracker from '../components/gadgets/OverwatchTracker'
import ReadyCheck from '../components/gadgets/ReadyCheck'
import ScheduleMatrix from '../components/gadgets/ScheduleMatrix'
import SessionRecap from '../components/gadgets/SessionRecap'
import Shoutbox from '../components/gadgets/Shoutbox'
import SpriteChecklist from '../components/gadgets/SpriteChecklist'
import SquadGoals from '../components/gadgets/SquadGoals'
import SquadLeaderboard from '../components/gadgets/SquadLeaderboard'
import StreaksRecords from '../components/gadgets/StreaksRecords'

// 1 column on mobile, 2 on large, 3 on extra-large.
const GRID = 'grid grid-cols-1 items-start gap-6 lg:grid-cols-2 xl:grid-cols-3'

/*
 * Gadget registry. `id`s are what get saved in the user's hidden list,
 * so don't rename them once people have customised their board.
 */
const SECTIONS = [
  {
    id: 'squad',
    title: 'Squad',
    icon: Users,
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
    icon: Swords,
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
    id: 'boards',
    title: 'Boards',
    icon: Gamepad,
    gadgets: [
      { id: 'bounties', title: 'Bounty Board', Component: BountyBoard },
      { id: 'goals', title: 'Squad Goals', Component: SquadGoals },
      { id: 'sprites', title: 'Sprite Checklist', Component: SpriteChecklist, span: 'lg:col-span-2 xl:col-span-1' },
    ],
  },
]

function Section({ title, icon: Icon, actions, children }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-2">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-gray-100">
          <Icon className="h-5 w-5 text-indigo-400" />
          {title}
        </h2>
        {actions}
      </div>
      <div className={GRID}>{children}</div>
    </section>
  )
}

export default function Dashboard() {
  const { isVisible, setVisible, error } = useGadgetPrefs()
  const [customizing, setCustomizing] = useState(false)

  const visibleSections = SECTIONS.map((s) => ({ ...s, shown: s.gadgets.filter((g) => isVisible(g.id)) })).filter(
    (s) => s.shown.length > 0,
  )

  return (
    <SquadDataProvider>
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <GroupChips sections={SECTIONS} isVisible={isVisible} setVisible={setVisible} />
          <button className="btn-ghost py-1.5 text-xs" onClick={() => setCustomizing((v) => !v)}>
            <Settings2 className="h-4 w-4" />
            Customize
          </button>
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
        {!customizing && error && <p className="text-sm text-red-400">Couldn&apos;t save gadget settings: {error}</p>}

        {visibleSections.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center text-gray-500">
            <LayoutGrid className="h-10 w-10" />
            <p>All gadgets are hidden.</p>
            <button className="btn-primary" onClick={() => setVisible(SECTIONS.flatMap((s) => s.gadgets.map((g) => g.id)), true)}>
              Show everything
            </button>
          </div>
        ) : (
          visibleSections.map((s) => (
            <Section key={s.id} title={s.title} icon={s.icon} actions={s.actions}>
              {s.shown.map(({ id, Component, span }) => (
                <div key={id} className={`min-w-0 ${span ?? ''}`}>
                  <Component />
                </div>
              ))}
            </Section>
          ))
        )}
      </div>
    </SquadDataProvider>
  )
}
