import BountyBoard from '../components/gadgets/BountyBoard'
import OverwatchTracker from '../components/gadgets/OverwatchTracker'
import ScheduleMatrix from '../components/gadgets/ScheduleMatrix'

export default function Dashboard() {
  return (
    // 1 column on mobile, 2 on large (tracker spans full width), 3 on extra-large.
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 xl:grid-cols-3">
      <div className="min-w-0 lg:col-span-2 xl:col-span-1">
        <OverwatchTracker />
      </div>
      <ScheduleMatrix />
      <BountyBoard />
    </div>
  )
}
