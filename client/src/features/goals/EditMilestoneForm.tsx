import { useState } from 'react'
import { db, type Milestone } from '../../lib/db'
import { revokeXp } from '../../lib/xp'
import { toast } from '../../lib/toast'

export default function EditMilestoneForm({ milestone, onDone }: { milestone: Milestone; onDone: () => void }) {
  const [title, setTitle] = useState(milestone.title)

  async function saveTitle() {
    const trimmed = title.trim()
    if (!trimmed || trimmed === milestone.title) return
    await db.milestones.update(milestone.id, { title: trimmed, updatedAt: new Date().toISOString() })
    toast('Milestone updated')
  }

  async function remove() {
    if (milestone.done) await revokeXp('milestone', milestone.id)
    const tasks = await db.tasks.where('milestoneId').equals(milestone.id).toArray()
    await Promise.all(
      tasks.map(async (t) => {
        if (t.done) await revokeXp('task', t.id)
        await db.tasks.delete(t.id)
      }),
    )
    await db.milestones.delete(milestone.id)
    toast('Milestone deleted')
    onDone()
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[var(--text-2)]">Milestone</span>
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

      <button
        type="button"
        onClick={remove}
        className="rounded-xl border border-[var(--border)] py-3 text-sm font-semibold text-red-600"
      >
        Delete milestone
      </button>
    </div>
  )
}
