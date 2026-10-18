import { useDailyQuests } from '../lib/quests'
import { XP_REWARDS } from '../lib/xp'

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

export default function DailyQuestsCard() {
  const { quests, allDone } = useDailyQuests()

  return (
    <div
      className={`rounded-2xl border p-4 ${
        allDone ? 'border-transparent bg-[var(--accent)]' : 'border-[var(--border)] bg-[var(--surface)]'
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className={`text-xs font-bold uppercase tracking-wide ${allDone ? 'text-white' : 'text-[var(--text-3)]'}`}>
          Daily quests
        </span>
        <span className={`text-[11px] font-semibold ${allDone ? 'text-white' : 'text-[var(--text-3)]'}`}>
          {allDone ? `+${XP_REWARDS.quest} XP earned` : `+${XP_REWARDS.quest} XP for clearing all`}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {quests.map((q) => (
          <div key={q.id} className="flex items-center gap-2.5">
            <div
              className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full ${
                q.done
                  ? allDone
                    ? 'bg-white'
                    : 'bg-[var(--good)]'
                  : allDone
                    ? 'border-2 border-white/50'
                    : 'border-2 border-[var(--border)]'
              }`}
            >
              {q.done && <CheckIcon />}
            </div>
            <span
              className={`flex-1 text-sm ${
                allDone ? 'text-white' : q.done ? 'text-[var(--text-3)] line-through' : 'text-[var(--text)]'
              }`}
            >
              {q.title}
            </span>
            <span className={`text-xs font-medium ${allDone ? 'text-white/80' : 'text-[var(--text-3)]'}`}>
              {q.current}/{q.target}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
