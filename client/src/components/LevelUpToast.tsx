import { useEffect, useRef, useState } from 'react'
import { useLevel } from './LevelBadge'
import { computeRank } from '../lib/xp'
import Mascot from './Mascot'
import Confetti from './Confetti'

const LAST_LEVEL_KEY = 'life-planner:last-seen-level'

/** Mount once near the app root. Compares the live level against the last
 * one we showed a toast for (persisted so a page reload doesn't re-fire
 * it) and celebrates any increase — including a rank-up callout when the
 * new level crosses into a new rank tier. */
export default function LevelUpToast() {
  const { level } = useLevel()
  const [shown, setShown] = useState<{ from: number; to: number } | null>(null)
  const initialized = useRef(false)

  useEffect(() => {
    const stored = Number(localStorage.getItem(LAST_LEVEL_KEY) ?? level)
    if (!initialized.current) {
      // First render after load: just record where we are, no toast for
      // whatever level the account already had.
      initialized.current = true
      if (!localStorage.getItem(LAST_LEVEL_KEY)) localStorage.setItem(LAST_LEVEL_KEY, String(level))
      return
    }
    if (level > stored) {
      setShown({ from: stored, to: level })
      localStorage.setItem(LAST_LEVEL_KEY, String(level))
    }
  }, [level])

  if (!shown) return null
  const rankedUp = computeRank(shown.from).rank !== computeRank(shown.to).rank

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-6">
      <div className="relative animate-[badge-pop_0.4s_ease-out] flex flex-col items-center gap-3 rounded-3xl bg-[var(--surface)] p-6 text-center">
        <Confetti />
        <Mascot level={shown.to} mood="happy" size={96} interactive={false} />
        <div className="text-xs font-bold uppercase tracking-wide text-[var(--accent)]">
          {rankedUp ? 'Rank up!' : 'Level up!'}
        </div>
        <div className="text-2xl font-black">Level {shown.to}</div>
        {rankedUp && (
          <div className="text-sm font-semibold text-[var(--text-2)]">
            You're now {computeRank(shown.to).name}
          </div>
        )}
        <button
          onClick={() => setShown(null)}
          className="mt-2 rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white"
        >
          Keep going
        </button>
      </div>
    </div>
  )
}
