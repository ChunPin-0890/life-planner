import { useState } from 'react'
import { db, type Goal } from '../../lib/db'
import { revokeXp } from '../../lib/xp'
import { toast } from '../../lib/toast'

const CATEGORIES = ['Career & business', 'Health', 'Learning', 'Personal', 'Finance']

export default function EditGoalForm({ goal, onDone }: { goal: Goal; onDone: () => void }) {
  const [title, setTitle] = useState(goal.title)
  const [targetDate, setTargetDate] = useState(goal.targetDate ?? '')
  const [targetCount, setTargetCount] = useState(goal.targetCount ? String(goal.targetCount) : '')

  async function saveTitle() {
    const trimmed = title.trim()
    if (!trimmed || trimmed === goal.title) return
    await db.goals.update(goal.id, { title: trimmed, updatedAt: new Date().toISOString() })
    toast('Goal updated')
  }

  async function setCategory(category: string) {
    await db.goals.update(goal.id, { category, updatedAt: new Date().toISOString() })
    toast('Goal updated')
  }

  async function saveTargetDate(value: string) {
    setTargetDate(value)
    await db.goals.update(goal.id, { targetDate: value || undefined, updatedAt: new Date().toISOString() })
    toast('Goal updated')
  }

  async function saveTargetCount() {
    const n = targetCount.trim() ? Math.max(0, parseInt(targetCount, 10) || 0) : 0
    if (n === (goal.targetCount ?? 0)) return
    await db.goals.update(goal.id, {
      targetCount: n || undefined,
      currentCount: n ? Math.min(goal.currentCount ?? 0, n) : undefined,
      updatedAt: new Date().toISOString(),
    })
    toast('Goal updated')
  }

  async function remove() {
    // Cascade: milestones and tasks that only make sense in the context of
    // this goal shouldn't be left dangling with a goalId pointing nowhere.
    const [milestones, tasks] = await Promise.all([
      db.milestones.where('goalId').equals(goal.id).toArray(),
      db.tasks.where('goalId').equals(goal.id).toArray(),
    ])
    await Promise.all([
      ...milestones.map(async (m) => {
        if (m.done) await revokeXp('milestone', m.id)
        await db.milestones.delete(m.id)
      }),
      ...tasks.map(async (t) => {
        if (t.done) await revokeXp('task', t.id)
        await db.tasks.delete(t.id)
      }),
    ])
    await db.goals.delete(goal.id)
    toast('Goal deleted')
    onDone()
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[var(--text-2)]">Goal</span>
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

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[var(--text-2)]">Category</span>
        <select
          value={goal.category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[var(--text-2)]">Target date (optional)</span>
        <input
          type="date"
          value={targetDate}
          onChange={(e) => saveTargetDate(e.target.value)}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[var(--text-2)]">
          Track by count instead of milestones (optional)
        </span>
        <input
          type="number"
          min={0}
          value={targetCount}
          onChange={(e) => setTargetCount(e.target.value)}
          onBlur={saveTargetCount}
          placeholder="e.g. 50 — leave blank to use milestones instead"
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
        />
      </label>

      <button
        type="button"
        onClick={remove}
        className="rounded-xl border border-[var(--border)] py-3 text-sm font-semibold text-red-600"
      >
        Delete goal (and its milestones/tasks)
      </button>
    </div>
  )
}
