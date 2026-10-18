import { useState } from 'react'
import { nanoid } from 'nanoid'
import { db } from '../../lib/db'
import { toast } from '../../lib/toast'

const CATEGORIES = ['Career & business', 'Health', 'Learning', 'Personal', 'Finance']

interface GoalTemplate {
  name: string
  title: string
  category: string
  milestones: string[]
}

const TEMPLATES: GoalTemplate[] = [
  {
    name: 'Get fit',
    title: 'Get in the best shape of my life',
    category: 'Health',
    milestones: [
      'Build a consistent workout routine',
      'Hit 3 workouts a week for a month straight',
      'Reach my target weight/strength benchmark',
      'Maintain it for 3 months',
    ],
  },
  {
    name: 'Career change',
    title: 'Land a role in a new field',
    category: 'Career & business',
    milestones: [
      'Identify the target role and required skills',
      'Build a portfolio/resume for the new field',
      'Apply to 20 relevant roles',
      'Land the offer',
    ],
  },
  {
    name: 'Learn a skill',
    title: 'Become genuinely good at [skill]',
    category: 'Learning',
    milestones: [
      'Finish a structured course or book',
      'Complete 3 real practice projects',
      'Get feedback from someone experienced',
      'Use the skill in something real',
    ],
  },
  {
    name: 'Launch a business',
    title: 'Launch my own business',
    category: 'Career & business',
    milestones: [
      'Validate the idea with real prospects',
      'Register the business & set up finances',
      'Land the first paying customer',
      'Replace my current income',
    ],
  },
  {
    name: 'Save money',
    title: 'Build a real savings cushion',
    category: 'Finance',
    milestones: [
      'Track spending for a full month',
      'Set and hit a monthly savings target',
      'Reach a 3-month emergency fund',
      'Reach a 6-month emergency fund',
    ],
  },
]

export default function NewGoalForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [targetDate, setTargetDate] = useState('')
  const [milestones, setMilestones] = useState<string[]>([''])
  const [targetCount, setTargetCount] = useState('')

  function updateMilestone(i: number, value: string) {
    setMilestones((m) => m.map((x, idx) => (idx === i ? value : x)))
  }

  function addMilestoneField() {
    setMilestones((m) => [...m, ''])
  }

  function removeMilestone(i: number) {
    setMilestones((m) => m.filter((_, idx) => idx !== i))
  }

  function applyTemplate(t: GoalTemplate) {
    setTitle(t.title)
    setCategory(t.category)
    setMilestones(t.milestones)
  }

  async function submit() {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    const now = new Date().toISOString()
    const goalId = nanoid()
    const count = targetCount.trim() ? Math.max(0, parseInt(targetCount, 10) || 0) : 0
    await db.goals.add({
      id: goalId,
      title: trimmedTitle,
      category,
      targetDate: targetDate || undefined,
      createdAt: now,
      updatedAt: now,
      targetCount: count || undefined,
      currentCount: count ? 0 : undefined,
    })

    const cleanMilestones = count ? [] : milestones.map((m) => m.trim()).filter(Boolean)
    if (cleanMilestones.length) {
      await db.milestones.bulkAdd(
        cleanMilestones.map((title, order) => ({
          id: nanoid(),
          goalId,
          title,
          done: false,
          order,
          updatedAt: now,
        })),
      )
    }

    toast('Goal created')
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
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[var(--text-2)]">Start from a template (optional)</span>
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATES.map((t) => (
            <button
              key={t.name}
              type="button"
              onClick={() => applyTemplate(t)}
              className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-2)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[var(--text-2)]">Goal</span>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Launch my consulting business"
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[var(--text-2)]">Category</span>
        <select
          value={category}
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
          onChange={(e) => setTargetDate(e.target.value)}
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
          placeholder="e.g. 50 — for goals like &quot;chant 50 times&quot;"
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
        />
      </label>

      {!targetCount.trim() && (
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[var(--text-2)]">Milestones</span>
        {milestones.map((m, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={m}
              onChange={(e) => updateMilestone(i, e.target.value)}
              placeholder={`Milestone ${i + 1}`}
              className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            {milestones.length > 1 && (
              <button
                type="button"
                onClick={() => removeMilestone(i)}
                aria-label="Remove milestone"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-3)] hover:bg-[var(--surface-2)]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addMilestoneField}
          className="self-start text-xs font-semibold text-[var(--accent)]"
        >
          + Add another milestone
        </button>
      </div>
      )}

      <button
        type="submit"
        disabled={!title.trim()}
        className="mt-1 rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white disabled:opacity-40"
      >
        Create goal
      </button>
    </form>
  )
}
