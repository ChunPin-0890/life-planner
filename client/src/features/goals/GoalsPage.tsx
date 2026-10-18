import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { nanoid } from 'nanoid'
import { useNavigate } from 'react-router-dom'
import { db, type Goal, type Milestone, type Task } from '../../lib/db'
import Modal from '../../components/Modal'
import NewGoalForm from './NewGoalForm'
import EditGoalForm from './EditGoalForm'
import EditMilestoneForm from './EditMilestoneForm'
import NorthStarCard from '../../components/NorthStarCard'
import { awardXp, revokeXp, XP_REWARDS } from '../../lib/xp'
import { stepGoalCounter } from '../../lib/goalCounter'
import { todayISO } from '../../lib/date'

function FlameIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="#c9853b" stroke="none">
      <path d="M12 2c1 4-3 5-3 9a3 3 0 0 0 6 0c1.5 1 2 3 2 4.5A5.5 5.5 0 0 1 6 20c0-5 2-6 3-9 0 2 1 3 2 3 1.5 0 1-2-1-4 1 0 2-1 2-2-1-1-1-3 0-6z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  )
}

function GoalCard({
  goal,
  expanded,
  onToggle,
  onEditGoal,
  onEditMilestone,
}: {
  goal: Goal
  expanded: boolean
  onToggle: () => void
  onEditGoal: () => void
  onEditMilestone: (m: Milestone) => void
}) {
  const milestones =
    useLiveQuery(() => db.milestones.where('goalId').equals(goal.id).sortBy('order'), [goal.id]) ?? []
  const tasksByMilestone =
    useLiveQuery(async () => {
      const tasks = await db.tasks.where('goalId').equals(goal.id).toArray()
      const map = new Map<string, Task[]>()
      for (const t of tasks) {
        if (!t.milestoneId) continue
        map.set(t.milestoneId, [...(map.get(t.milestoneId) ?? []), t])
      }
      return map
    }, [goal.id]) ?? new Map<string, Task[]>()

  const isCounterGoal = (goal.targetCount ?? 0) > 0
  const currentCount = goal.currentCount ?? 0
  const targetCount = goal.targetCount ?? 0

  const progress = isCounterGoal
    ? Math.round((currentCount / targetCount) * 100)
    : milestones.length
      ? Math.round((milestones.filter((m) => m.done).length / milestones.length) * 100)
      : 0

  async function toggleMilestone(id: string, done: boolean) {
    await db.milestones.update(id, { done: !done, updatedAt: new Date().toISOString() })
    if (!done) {
      await awardXp('milestone', id)
    } else {
      await revokeXp('milestone', id)
    }
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
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-start justify-between gap-2">
        <button onClick={onToggle} className="flex-1 text-left">
          <div className="text-[10px] font-bold tracking-wide text-[var(--accent)] uppercase">{goal.category}</div>
          <div className="mt-1 text-sm font-bold">{goal.title}</div>
        </button>
        <button
          onClick={onEditGoal}
          aria-label="Edit goal"
          className="shrink-0 rounded-lg p-1.5 text-[var(--text-3)] hover:bg-[var(--surface-2)]"
        >
          <PencilIcon />
        </button>
        <button onClick={onToggle} aria-label={expanded ? 'Collapse' : 'Expand'} className="shrink-0 p-1">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-3)"
            strokeWidth={2.3}
            className={`transition-transform ${expanded ? '' : '-rotate-90'}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2.5">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
          <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${progress}%` }} />
        </div>
        {isCounterGoal ? (
          <span className="whitespace-nowrap text-xs font-semibold text-[var(--text-2)]">
            {currentCount}/{targetCount}
          </span>
        ) : (
          <span className="text-xs font-semibold text-[var(--text-2)]">{progress}%</span>
        )}
        {isCounterGoal && currentCount < targetCount && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              stepGoalCounter(goal, 1)
            }}
            aria-label="Increase count"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--accent)] text-sm font-bold leading-none text-white"
          >
            +
          </button>
        )}
      </div>

      {expanded && isCounterGoal && (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-[var(--surface-2)] p-3">
          <button
            onClick={() => stepGoalCounter(goal, -1)}
            disabled={currentCount === 0}
            aria-label="Decrease count"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface)] text-lg font-bold text-[var(--text-2)] disabled:opacity-30"
          >
            −
          </button>
          <div className="text-center">
            <div className="text-lg font-black">
              {currentCount} <span className="text-sm font-semibold text-[var(--text-3)]">/ {targetCount}</span>
            </div>
            {currentCount < targetCount ? (
              <div className="text-[10px] font-semibold text-[var(--text-3)]">
                +{XP_REWARDS.goalCounter} XP at {targetCount}
              </div>
            ) : (
              <div className="text-[10px] font-semibold text-[var(--good)]">Complete!</div>
            )}
          </div>
          <button
            onClick={() => stepGoalCounter(goal, 1)}
            disabled={currentCount >= targetCount}
            aria-label="Increase count"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)] text-lg font-bold text-white disabled:opacity-30"
          >
            +
          </button>
        </div>
      )}

      {expanded && !isCounterGoal && milestones.length > 0 && (
        <div className="mt-4 flex flex-col gap-2.5">
          {milestones.map((m) => {
            const tasks = tasksByMilestone.get(m.id) ?? []
            return (
              <div key={m.id}>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleMilestone(m.id, m.done)} className="flex flex-1 items-center gap-2 text-left">
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        m.done ? 'animate-[badge-pop_0.3s_ease-out] bg-[var(--good)]' : 'border-2 border-[var(--accent)]'
                      }`}
                    >
                      {m.done && <CheckIcon />}
                    </div>
                    <span className={`text-sm font-semibold ${m.done ? 'text-[var(--text-3)] line-through' : ''}`}>
                      {m.title}
                    </span>
                    {!m.done && (
                      <span className="ml-auto shrink-0 text-[10px] font-semibold text-[var(--text-3)]">
                        +{XP_REWARDS.milestone} XP
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => onEditMilestone(m)}
                    aria-label="Edit milestone"
                    className="shrink-0 rounded-lg p-1 text-[var(--text-3)] hover:bg-[var(--surface-2)]"
                  >
                    <PencilIcon />
                  </button>
                </div>
                {tasks.length > 0 && (
                  <div className="mt-1.5 ml-7 flex flex-col gap-1.5">
                    {tasks.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => toggleTask(t.id, t.done)}
                        className="flex w-full items-center gap-2 text-left"
                      >
                        <div
                          className={`h-[15px] w-[15px] shrink-0 rounded ${
                            t.done ? 'animate-[badge-pop_0.3s_ease-out] bg-[var(--good)]' : 'border border-[var(--border)]'
                          }`}
                        />
                        <span className={`text-xs ${t.done ? 'text-[var(--text-3)] line-through' : ''}`}>
                          {t.title}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {expanded && <LinkedHabits goalId={goal.id} />}
    </div>
  )
}

function LinkedHabits({ goalId }: { goalId: string }) {
  const navigate = useNavigate()
  const habits = useLiveQuery(() => db.habits.where('goalId').equals(goalId).toArray(), [goalId]) ?? []
  const today = todayISO()
  const todaysLogs =
    useLiveQuery(() => db.habitLogs.where('date').equals(today).toArray(), [today]) ?? []

  if (habits.length === 0) return null

  async function toggleToday(habitId: string) {
    const existing = todaysLogs.find((l) => l.habitId === habitId)
    const xpRefId = `${habitId}:${today}`
    if (existing) {
      await db.habitLogs.update(existing.id, { completed: !existing.completed })
      if (existing.completed) await revokeXp('habit', xpRefId)
      else await awardXp('habit', xpRefId)
    } else {
      await db.habitLogs.add({ id: nanoid(), habitId, date: today, completed: true })
      await awardXp('habit', xpRefId)
    }
  }

  return (
    <div className="mt-4 border-t border-[var(--border)] pt-3.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-3)]">
          Daily habits driving this goal
        </span>
        <button onClick={() => navigate('/habits')} className="text-[10px] font-semibold text-[var(--accent)]">
          View all
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        {habits.map((h) => {
          const completed = todaysLogs.find((l) => l.habitId === h.id)?.completed
          return (
            <button
              key={h.id}
              onClick={() => toggleToday(h.id)}
              className="flex items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-[var(--surface-2)]"
            >
              <div
                className={`flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full ${
                  completed ? 'bg-[var(--good)]' : 'border-2 border-[var(--border)]'
                }`}
              >
                {completed && <CheckIcon />}
              </div>
              <span className={`text-xs ${completed ? 'text-[var(--text-3)] line-through' : ''}`}>{h.title}</span>
              <FlameIcon />
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function GoalsPage() {
  const goals = useLiveQuery(() => db.goals.toArray()) ?? []
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showNewGoal, setShowNewGoal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null)

  return (
    <div className="flex flex-col gap-4 p-5">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Goals</h1>
        <button
          onClick={() => setShowNewGoal(true)}
          className="animate-[badge-pop_0.3s_ease-out] rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white"
        >
          New goal
        </button>
      </header>

      <NorthStarCard />

      {goals.length === 0 ? (
        <p className="text-sm text-[var(--text-3)]">No goals yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {goals.map((g, i) => (
            <GoalCard
              key={g.id}
              goal={g}
              expanded={expandedId ? expandedId === g.id : i === 0}
              onToggle={() => setExpandedId(expandedId === g.id ? '' : g.id)}
              onEditGoal={() => setEditingGoal(g)}
              onEditMilestone={setEditingMilestone}
            />
          ))}
        </div>
      )}

      <Modal open={showNewGoal} onClose={() => setShowNewGoal(false)} title="New goal">
        <NewGoalForm onDone={() => setShowNewGoal(false)} />
      </Modal>

      <Modal open={editingGoal !== null} onClose={() => setEditingGoal(null)} title="Edit goal">
        {editingGoal && <EditGoalForm goal={editingGoal} onDone={() => setEditingGoal(null)} />}
      </Modal>

      <Modal open={editingMilestone !== null} onClose={() => setEditingMilestone(null)} title="Edit milestone">
        {editingMilestone && (
          <EditMilestoneForm milestone={editingMilestone} onDone={() => setEditingMilestone(null)} />
        )}
      </Modal>
    </div>
  )
}
