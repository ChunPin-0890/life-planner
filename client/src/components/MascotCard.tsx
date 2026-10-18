import Mascot from './Mascot'
import { useLevel } from './LevelBadge'
import { useMascotState } from '../lib/mascotMood'

export default function MascotCard() {
  const { level } = useLevel()
  const { mood, message } = useMascotState()

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
      <Mascot level={level} mood={mood} size={64} />
      <p className="flex-1 text-sm text-[var(--text-2)]">{message}</p>
    </div>
  )
}
