import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { nanoid } from 'nanoid'
import { db, type Habit } from '../../lib/db'
import { toast } from '../../lib/toast'

export default function NewHabitForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState('')
  const [frequency, setFrequency] = useState<Habit['frequency']>('daily')
  const [goalId, setGoalId] = useState('')
  const goals = useLiveQuery(() => db.goals.toArray()) ?? []

  async function submit() {
    const trimmed = title.trim()
    if (!trimmed) return
    await db.habits.add({
      id: nanoid(),
      title: trimmed,
      frequency,
      goalId: goalId || undefined,
      updatedAt: new Date().toISOString(),
    })
    toast('Habit added')
    onDone()
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="flex flex-col gap-4"
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[var(--text-2)]">Habit name</span>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Meditate 10 minutes"
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
                frequency === f
                  ? 'bg-[var(--accent)] text-white'
                  : 'border border-[var(--border)] text-[var(--text-2)]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {goals.length > 0 && (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-[var(--text-2)]">In service of which goal? (optional)</span>
          <select
            value={goalId}
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
      )}

      <button
        type="submit"
        disabled={!title.trim()}
        className="mt-1 rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white disabled:opacity-40"
      >
        Add habit
      </button>
    </form>
  )
}
