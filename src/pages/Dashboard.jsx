import { Gamepad, Swords, Users } from 'lucide-react'
import { SquadDataProvider } from '../context/SquadDataContext'
import OwFilterBar from '../components/OwFilterBar'
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
  return (
    <SquadDataProvider>
      <div className="space-y-10">
        <Section title="Squad" icon={Users}>
          <ReadyCheck />
          <ScheduleMatrix />
          <div className="min-w-0 lg:col-span-2 xl:col-span-1">
            <Shoutbox />
          </div>
        </Section>

        <Section title="Overwatch" icon={Swords} actions={<OwFilterBar />}>
          <OverwatchTracker />
          <div className="min-w-0 lg:col-span-1 xl:col-span-2">
            <SquadLeaderboard />
          </div>
          <SessionRecap />
          <HeroPool />
          <StreaksRecords />
          <DuoSynergy />
        </Section>

        <Section title="Boards" icon={Gamepad}>
          <BountyBoard />
          <SquadGoals />
          <div className="min-w-0 lg:col-span-2 xl:col-span-1">
            <SpriteChecklist />
          </div>
        </Section>
      </div>
    </SquadDataProvider>
  )
}
