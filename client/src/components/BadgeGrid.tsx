import { useAchievements } from '../lib/achievements'

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="none">
      <path d="M12 2l2.9 6.6 7.1.7-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.3l7.1-.7z" />
    </svg>
  )
}

export default function BadgeGrid() {
  const achievements = useAchievements()

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">Achievements</div>
      <div className="grid grid-cols-3 gap-3">
        {achievements.map((a) => (
          <div key={a.id} className="flex flex-col items-center gap-1.5 text-center">
            <div
              className={`relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl ${
                a.unlocked ? 'bg-gradient-to-br from-[oklch(70%_0.14_55)] to-[oklch(58%_0.16_40)]' : 'bg-[var(--surface-2)]'
              }`}
            >
              {a.unlocked ? <StarIcon /> : <LockIcon />}
            </div>
            <span className={`text-[11px] font-semibold ${a.unlocked ? 'text-[var(--text)]' : 'text-[var(--text-3)]'}`}>
              {a.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
