import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { db } from '../lib/db'
import { computeLevel } from '../lib/xp'

export function useLevel() {
  const totalXp = useLiveQuery(async () => {
    const events = await db.xpEvents.toArray()
    return events.reduce((sum, e) => sum + e.amount, 0)
  }, [])
  return computeLevel(totalXp ?? 0)
}

/** Compact "Lv N" badge with a thin XP progress ring — for headers/nav.
 * Clicking it opens the Profile page. */
export default function LevelBadge({ size = 36 }: { size?: number }) {
  const navigate = useNavigate()
  const { level, xpIntoLevel, xpForNextLevel, progress } = useLevel()
  const r = size / 2 - 3
  const c = 2 * Math.PI * r

  return (
    <button
      onClick={() => navigate('/profile')}
      className="flex items-center gap-2"
      title={`${xpIntoLevel} / ${xpForNextLevel} XP to next level — view profile`}
      aria-label="View profile"
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="var(--accent-soft)" stroke="var(--surface-2)" strokeWidth={3} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          className="transition-[stroke-dashoffset] duration-500"
        />
        <text
          x={size / 2}
          y={size / 2}
          transform={`rotate(90 ${size / 2} ${size / 2})`}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-[var(--accent)] text-[10px] font-bold"
        >
          {level}
        </text>
      </svg>
    </button>
  )
}
