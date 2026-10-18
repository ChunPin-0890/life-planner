import { useWeeklyBoss, defeatBoss } from '../lib/weeklyBoss'
import { XP_REWARDS } from '../lib/xp'

function SwordIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
      <path d="M14.5 3.5l6 6-9 9-6-1-1-6 9-9z" />
      <path d="M4 20l3-3M17.5 6.5l-11 11" />
    </svg>
  )
}

export default function BossCard() {
  const { milestone, weekKey } = useWeeklyBoss()

  if (!milestone) return null

  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[oklch(45%_0.17_25)] to-[oklch(30%_0.12_20)] p-4">
      <div className="mb-2 flex items-center gap-2 text-white">
        <SwordIcon />
        <span className="text-xs font-bold uppercase tracking-wide">This week's boss</span>
      </div>
      <div className="text-sm font-bold text-white">{milestone.title}</div>
      <div className="mt-0.5 text-xs text-white/70">Part of: {milestone.goalTitle}</div>
      <button
        onClick={() => defeatBoss(milestone.id, weekKey, milestone.done)}
        className="mt-3 w-full rounded-xl bg-white py-2.5 text-sm font-bold text-[oklch(45%_0.17_25)]"
      >
        Defeat boss · +{XP_REWARDS.milestone + XP_REWARDS.boss} XP
      </button>
    </div>
  )
}
