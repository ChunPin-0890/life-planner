import { useAchievements, useNewlyUnlocked } from '../lib/achievements'
import Confetti from './Confetti'

function TrophyIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.8}>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
      <path d="M8 5H5a3 3 0 0 0 3 5M16 5h3a3 3 0 0 1-3 5" />
      <path d="M12 13v3M9 20h6M10 16.5h4" />
    </svg>
  )
}

/** Mount once near the app root — watches for achievements flipping to
 * unlocked and shows a full-width celebratory banner, Duolingo-style,
 * dismissed by the user or automatically after a few seconds. */
export default function AchievementUnlockToast() {
  const achievements = useAchievements()
  const { newlyUnlocked, dismiss } = useNewlyUnlocked(achievements)

  if (newlyUnlocked.length === 0) return null
  const current = newlyUnlocked[0]

  return (
    <div className="fixed inset-x-0 top-0 z-[60] flex justify-center p-4">
      <div
        key={current.id}
        className="relative animate-[badge-pop_0.4s_ease-out] flex max-w-sm items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-[oklch(70%_0.14_55)] to-[oklch(58%_0.16_40)] p-4 shadow-lg"
      >
        <Confetti count={12} />
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20">
          <TrophyIcon />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold uppercase tracking-wide text-white/80">Achievement unlocked</div>
          <div className="text-sm font-bold text-white">{current.title}</div>
          <div className="text-xs text-white/80">{current.description}</div>
        </div>
        <button
          onClick={() => dismiss(current.id)}
          aria-label="Dismiss"
          className="shrink-0 rounded-full p-1 text-white/80 hover:bg-white/10"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.3}>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  )
}
