import { useState } from 'react'
import { db, type Task } from '../../lib/db'
import { revokeXp } from '../../lib/xp'
import { stopRecurring } from '../../lib/recurringTasks'
import { toast } from '../../lib/toast'

export default function EditTaskForm({ task, onDone }: { task: Task; onDone: () => void }) {
  const [title, setTitle] = useState(task.title)

  async function saveTitle() {
    const trimmed = title.trim()
    if (!trimmed || trimmed === task.title) return
    await db.tasks.update(task.id, { title: trimmed, updatedAt: new Date().toISOString() })
    toast('Task updated')
  }

  async function remove() {
    if (task.done) await revokeXp('task', task.id) // don't leave orphaned XP behind
    await db.tasks.delete(task.id)
    toast('Task deleted')
    onDone()
  }

  async function handleStopRecurring() {
    if (!task.templateId) return
    await stopRecurring(task.templateId)
    toast('Stopped repeating')
    onDone()
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[var(--text-2)]">Task</span>
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

      {task.templateId && (
        <button
          type="button"
          onClick={handleStopRecurring}
          className="rounded-xl border border-[var(--border)] py-3 text-sm font-semibold text-[var(--text-2)]"
        >
          Stop repeating this task
        </button>
      )}

      <button
        type="button"
        onClick={remove}
        className="rounded-xl border border-[var(--border)] py-3 text-sm font-semibold text-red-600"
      >
        Delete task
      </button>
    </div>
  )
}
