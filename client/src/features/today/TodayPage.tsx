import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { nanoid } from 'nanoid'
import { db, type Task, type ScheduleBlock } from '../../lib/db'
import { formatDay, todayISO } from '../../lib/date'
import Modal from '../../components/Modal'
import NewScheduleBlockForm from './NewScheduleBlockForm'
import EditTaskForm from './EditTaskForm'
import EditScheduleBlockForm from './EditScheduleBlockForm'
import LevelBadge from '../../components/LevelBadge'
import DailyQuestsCard from '../../components/DailyQuestsCard'
import MascotCard from '../../components/MascotCard'
import BossCard from '../../components/BossCard'
import { awardXp, revokeXp } from '../../lib/xp'
import { ensureRecurringTasksForToday, createRecurringTask } from '../../lib/recurringTasks'

function FlameIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="#c9853b" stroke="none">
      <path d="M12 2c1 4-3 5-3 9a3 3 0 0 0 6 0c1.5 1 2 3 2 4.5A5.5 5.5 0 0 1 6 20c0-5 2-6 3-9 0 2 1 3 2 3 1.5 0 1-2-1-4 1 0 2-1 2-2-1-1-1-3 0-6z" />
    </svg>
  )
}

const REPEAT_CYCLE: (Task['recurring'] | undefined)[] = [undefined, 'daily', 'weekly']

function to12h(time: string) {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${hour} ${period}` : `${hour}:${String(m).padStart(2, '0')} ${period}`
}

export default function TodayPage() {
  const navigate = useNavigate()
  const [draft, setDraft] = useState('')
  const [showNewBlock, setShowNewBlock] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null)
  const [repeatMode, setRepeatMode] = useState<Task['recurring'] | undefined>(undefined)
  const date = todayISO()

  useEffect(() => {
    ensureRecurringTasksForToday()
  }, [date])

  const tasks = useLiveQuery(() => db.tasks.where('dueDate').equals(date).toArray(), [date]) ?? []
  const blocks = useLiveQuery(() => db.scheduleBlocks.where('date').equals(date).sortBy('startTime'), [date]) ?? []
  const goals = useLiveQuery(() => db.goals.toArray()) ?? []
  const goalTitleById = new Map(goals.map((g) => [g.id, g.title]))
  const dailyHabits = useLiveQuery(() => db.habits.where('frequency').equals('daily').toArray()) ?? []
  const todaysHabitLogs = useLiveQuery(() => db.habitLogs.where('date').equals(date).toArray(), [date]) ?? []

  const doneCount = tasks.filter((t) => t.done).length
  const habitsDoneCount = dailyHabits.filter((h) => todaysHabitLogs.find((l) => l.habitId === h.id)?.completed).length

  async function toggleHabitToday(habitId: string) {
    const existing = todaysHabitLogs.find((l) => l.habitId === habitId)
    const xpRefId = `${habitId}:${date}`
    if (existing) {
      await db.habitLogs.update(existing.id, { completed: !existing.completed })
      if (existing.completed) await revokeXp('habit', xpRefId)
      else await awardXp('habit', xpRefId)
    } else {
      await db.habitLogs.add({ id: nanoid(), habitId, date, completed: true })
      await awardXp('habit', xpRefId)
    }
  }

  async function addTask() {
    const title = draft.trim()
    if (!title) return
    if (repeatMode) {
      await createRecurringTask(title, repeatMode)
    } else {
      await db.tasks.add({
        id: nanoid(),
        title,
        done: false,
        dueDate: date,
        updatedAt: new Date().toISOString(),
      })
    }
    setDraft('')
  }

  function cycleRepeatMode() {
    const idx = REPEAT_CYCLE.indexOf(repeatMode)
    setRepeatMode(REPEAT_CYCLE[(idx + 1) % REPEAT_CYCLE.length])
  }

  async function toggleTask(id: string, done: boolean) {
    await db.tasks.update(id, { done: !done, updatedAt: new Date().toISOString() })
    if (!done) {
      await awardXp('task', id)
    } else {
      await revokeXp('task', id)
    }
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Today</h1>
          <p className="text-sm text-[var(--text-2)]">{formatDay()}</p>
        </div>
        <LevelBadge />
      </header>

      <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all"
            style={{ width: tasks.length ? `${(doneCount / tasks.length) * 100}%` : '0%' }}
          />
        </div>
        <span className="whitespace-nowrap text-xs text-[var(--text-2)]">
          {doneCount} of {tasks.length} done
        </span>
      </div>

      {dailyHabits.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">Today's habits</h2>
            <span className="text-xs text-[var(--text-2)]">
              {habitsDoneCount} of {dailyHabits.length} done
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {dailyHabits.map((h) => {
              const completed = todaysHabitLogs.find((l) => l.habitId === h.id)?.completed
              return (
                <li
                  key={h.id}
                  className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"
                >
                  <button
                    onClick={() => toggleHabitToday(h.id)}
                    className={`h-[18px] w-[18px] shrink-0 rounded-full border-2 ${
                      completed ? 'animate-[badge-pop_0.3s_ease-out] border-[var(--good)] bg-[var(--good)]' : 'border-[var(--border)]'
                    }`}
                    aria-label={completed ? 'Mark incomplete' : 'Mark complete'}
                  />
                  <span className={`flex-1 text-sm ${completed ? 'text-[var(--text-3)] line-through' : ''}`}>
                    {h.title}
                  </span>
                  {h.goalId && goalTitleById.get(h.goalId) && (
                    <button
                      onClick={() => navigate('/goals')}
                      className="shrink-0 max-w-[35%] truncate rounded-md bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)]"
                      title={`Serves: ${goalTitleById.get(h.goalId)}`}
                    >
                      → {goalTitleById.get(h.goalId)}
                    </button>
                  )}
                  <FlameIcon />
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <MascotCard />

      <BossCard />

      <DailyQuestsCard />

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">Schedule</h2>
          <button
            onClick={() => setShowNewBlock(true)}
            className="text-xs font-semibold text-[var(--accent)]"
          >
            + Add
          </button>
        </div>
        {blocks.length === 0 ? (
          <p className="text-sm text-[var(--text-3)]">No time-blocked events yet.</p>
        ) : (
          <ul className="flex flex-col">
            {blocks.map((b) => (
              <li key={b.id} className="flex min-h-[56px] gap-3">
                <div className="w-11 shrink-0 pt-0.5 text-xs text-[var(--text-3)]">{to12h(b.startTime)}</div>
                <div className="flex-1 border-l-2 border-[var(--border)] pb-3.5 pl-3">
                  <button onClick={() => setEditingBlock(b)} className="w-full rounded-xl bg-[var(--surface-2)] px-3.5 py-2.5 text-left">
                    <div className="text-sm font-semibold">{b.title}</div>
                    <div className="mt-0.5 text-xs text-[var(--text-2)]">
                      {to12h(b.startTime)} – {to12h(b.endTime)}
                    </div>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">To-do</h2>
        <ul className="flex flex-col gap-2">
          {tasks.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"
            >
              <button
                onClick={() => toggleTask(t.id, t.done)}
                className={`h-[18px] w-[18px] shrink-0 rounded-full border-2 transition-transform ${
                  t.done ? 'animate-[badge-pop_0.3s_ease-out] border-[var(--good)] bg-[var(--good)]' : 'border-[var(--border)]'
                }`}
                aria-label={t.done ? 'Mark incomplete' : 'Mark complete'}
              />
              <button
                onClick={() => setEditingTask(t)}
                className={`flex flex-1 items-center gap-1.5 text-left text-sm ${t.done ? 'text-[var(--text-3)] line-through' : ''}`}
              >
                {t.title}
                {t.templateId && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--text-3)"
                    strokeWidth={2.3}
                    className="shrink-0"
                    aria-label="Repeats"
                  >
                    <path d="M17 2l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3" />
                  </svg>
                )}
              </button>
              {t.goalId && goalTitleById.get(t.goalId) && (
                <button
                  onClick={() => navigate('/goals')}
                  className="shrink-0 max-w-[40%] truncate rounded-md bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)]"
                  title={`Part of: ${goalTitleById.get(t.goalId)}`}
                >
                  → {goalTitleById.get(t.goalId)}
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-1.5 pl-4 pr-1.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
          placeholder={repeatMode ? `Quick add a ${repeatMode} task…` : 'Quick add a task…'}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-3)]"
        />
        <button
          onClick={cycleRepeatMode}
          aria-label="Toggle repeat"
          title={repeatMode ? `Repeats: ${repeatMode}` : 'One-time task (tap to make it repeat)'}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            repeatMode ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-3)] hover:bg-[var(--surface-2)]'
          }`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <path d="M17 2l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
        </button>
        <button
          onClick={addTask}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-white"
          aria-label="Add task"
        >
          +
        </button>
      </div>

      <Modal open={showNewBlock} onClose={() => setShowNewBlock(false)} title="Add to schedule">
        <NewScheduleBlockForm onDone={() => setShowNewBlock(false)} />
      </Modal>

      <Modal open={editingTask !== null} onClose={() => setEditingTask(null)} title="Edit task">
        {editingTask && <EditTaskForm task={editingTask} onDone={() => setEditingTask(null)} />}
      </Modal>

      <Modal open={editingBlock !== null} onClose={() => setEditingBlock(null)} title="Edit schedule event">
        {editingBlock && <EditScheduleBlockForm block={editingBlock} onDone={() => setEditingBlock(null)} />}
      </Modal>
    </div>
  )
}
