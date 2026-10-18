import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Habit } from '../../lib/db'
import { toast } from '../../lib/toast'

export default function EditHabitForm({ habit, onDone }: { habit: Habit; onDone: () => void }) {
  const [title, setTitle] = useState(habit.title)
  const goals = useLiveQuery(() => db.goals.toArray()) ?? []

  async function saveTitle() {
    const trimmed = title.trim()
    if (!trimmed || trimmed === habit.title) return
    await db.habits.update(habit.id, { title: trimmed, updatedAt: new Date().toISOString() })
    toast('Habit updated')
  }

  async function setFrequency(frequency: Habit['frequency']) {
    if (frequency === habit.frequency) return
    await db.habits.update(habit.id, { frequency, updatedAt: new Date().toISOString() })
    toast('Habit updated')
  }

  async function setGoalId(goalId: string) {
    await db.habits.update(habit.id, { goalId: goalId || undefined, updatedAt: new Date().toISOString() })
    toast('Habit updated')
  }

  async function remove() {
    // Cascade: drop this habit's log history too, so it doesn't linger as
    // orphaned rows synced forever.
    const logs = await db.habitLogs.where('habitId').equals(habit.id).toArray()
    await Promise.all(logs.map((l) => db.habitLogs.delete(l.id)))
    await db.habits.delete(habit.id)
    toast('Habit deleted')
    onDone()
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[var(--text-2)]">Habit name</span>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.currentTarget.blur()
            onDone()
          }}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[var(--text-2)]">Frequency</span>
        <div className="flex gap-2">
          {(['daily', 'weekly'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFrequency(f)}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold capitalize ${
                habit.frequency === f
                  ? 'bg-[var(--accent)] text-white'
                  : 'border border-[var(--border)] text-[var(--text-2)]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[var(--text-2)]">In service of which goal? (optional)</span>
        <select
          value={habit.goalId ?? ''}
          onChange={(e) => setGoalId(e.target.value)}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
        >
          <option value="">Not tied to a goal</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={remove}
        className="rounded-xl border border-[var(--border)] py-3 text-sm font-semibold text-red-600"
      >
        Delete habit
      </button>
    </div>
  )
}
