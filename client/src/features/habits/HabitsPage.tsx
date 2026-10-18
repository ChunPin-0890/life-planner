import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { nanoid } from 'nanoid'
import { db, type Habit } from '../../lib/db'
import Modal from '../../components/Modal'
import NewHabitForm from './NewHabitForm'
import EditHabitForm from './EditHabitForm'
import HabitCalendarModal from './HabitCalendarModal'
import { awardXp, revokeXp } from '../../lib/xp'
import { todayISO } from '../../lib/date'

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </svg>
  )
}

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] // matches Date.getDay(): 0=Sun..6=Sat

function last7Dates() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return todayISO(d)
  })
}

function FlameIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="#c9853b" stroke="none">
      <path d="M12 2c1 4-3 5-3 9a3 3 0 0 0 6 0c1.5 1 2 3 2 4.5A5.5 5.5 0 0 1 6 20c0-5 2-6 3-9 0 2 1 3 2 3 1.5 0 1-2-1-4 1 0 2-1 2-2-1-1-1-3 0-6z" />
    </svg>
  )
}

function HabitRow({ habit, onEdit, onShowCalendar }: { habit: Habit; onEdit: () => void; onShowCalendar: () => void }) {
  const dates = last7Dates()
  const today = todayISO()
  const logs = useLiveQuery(() => db.habitLogs.where('habitId').equals(habit.id).toArray(), [habit.id]) ?? []
  const logsByDate = new Map(logs.map((l) => [l.date, l]))
  const streak = logs.filter((l) => l.completed).length

  async function toggleToday() {
    const existing = logsByDate.get(today)
    const xpRefId = `${habit.id}:${today}`
    if (existing) {
      await db.habitLogs.update(existing.id, { completed: !existing.completed })
      if (existing.completed) {
        await revokeXp('habit', xpRefId)
      } else {
        await awardXp('habit', xpRefId)
      }
    } else {
      await db.habitLogs.add({ id: nanoid(), habitId: habit.id, date: today, completed: true })
      await awardXp('habit', xpRefId)
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
      <div className="mb-3 flex items-center gap-2">
        <button onClick={onEdit} className="flex-1 text-left text-sm font-semibold">
          {habit.title}
        </button>
        <div className="flex shrink-0 items-center gap-1 text-xs font-bold text-[#c9853b]">
          <FlameIcon />
          {streak}
        </div>
        <button
          onClick={onShowCalendar}
          aria-label="View calendar"
          className="shrink-0 rounded-lg p-1 text-[var(--text-3)] hover:bg-[var(--surface-2)]"
        >
          <CalendarIcon />
        </button>
      </div>
      <div className="flex justify-between gap-1">
        {dates.map((d) => {
          const isToday = d === today
          const completed = logsByDate.get(d)?.completed
          const dayNum = parseInt(d.slice(-2), 10)
          const weekday = WEEKDAY_LETTERS[new Date(d + 'T00:00:00').getDay()]
          const Tag = isToday ? 'button' : 'div'
          return (
            <Tag
              key={d}
              onClick={isToday ? toggleToday : undefined}
              title={isToday ? "Today — tap to mark done" : d}
              className={`flex h-11 w-9 flex-col items-center justify-center gap-0.5 rounded-lg ${
                completed
                  ? 'bg-[var(--good)]'
                  : isToday
                    ? 'bg-[var(--accent-soft)] ring-2 ring-[var(--accent)]'
                    : 'bg-[var(--surface-2)]'
              }`}
            >
              <span
                className={`text-[9px] font-semibold ${
                  completed ? 'text-white/80' : isToday ? 'text-[var(--accent)]' : 'text-[var(--text-3)]'
                }`}
              >
                {weekday}
              </span>
              <span
                className={`text-[13px] font-bold leading-none ${
                  completed ? 'text-white' : isToday ? 'text-[var(--accent)]' : 'text-[var(--text-2)]'
                }`}
              >
                {dayNum}
              </span>
            </Tag>
          )
        })}
      </div>
    </div>
  )
}

export default function HabitsPage() {
  const [filter, setFilter] = useState<'daily' | 'weekly' | 'all'>('daily')
  const [showNewHabit, setShowNewHabit] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [calendarHabit, setCalendarHabit] = useState<Habit | null>(null)
  const allHabits = useLiveQuery(() => db.habits.toArray()) ?? []
  const habits = allHabits.filter((h) => filter === 'all' || h.frequency === filter)

  return (
    <div className="flex flex-col gap-4 p-5">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Habits</h1>
        <button
          onClick={() => setShowNewHabit(true)}
          aria-label="Add habit"
          className="animate-[badge-pop_0.3s_ease-out] flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-2)] text-lg leading-none text-[var(--text-2)]"
        >
          +
        </button>
      </header>

      <div className="flex gap-2">
        {(['daily', 'weekly', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize ${
              filter === f
                ? 'bg-[var(--accent)] text-white'
                : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)]'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {habits.length === 0 ? (
        <p className="text-sm text-[var(--text-3)]">No {filter !== 'all' ? filter : ''} habits yet.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {habits.map((h) => (
            <HabitRow
              key={h.id}
              habit={h}
              onEdit={() => setEditingHabit(h)}
              onShowCalendar={() => setCalendarHabit(h)}
            />
          ))}
        </div>
      )}

      <Modal open={showNewHabit} onClose={() => setShowNewHabit(false)} title="New habit">
        <NewHabitForm onDone={() => setShowNewHabit(false)} />
      </Modal>

      <Modal open={editingHabit !== null} onClose={() => setEditingHabit(null)} title="Edit habit">
        {editingHabit && <EditHabitForm habit={editingHabit} onDone={() => setEditingHabit(null)} />}
      </Modal>

      <Modal open={calendarHabit !== null} onClose={() => setCalendarHabit(null)} title={calendarHabit?.title ?? 'Calendar'}>
        {calendarHabit && <HabitCalendarModal habit={calendarHabit} />}
      </Modal>
    </div>
  )
}
