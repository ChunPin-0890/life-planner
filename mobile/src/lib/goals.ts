import { doc, getDocs, query, updateDoc, where, writeBatch } from 'firebase/firestore'
import { db } from './firebase'
import { userCollection, userDoc } from './firestore'
import type { Goal, Milestone, Task } from './types'
import { awardXp, revokeXp } from './xp'

export const CATEGORIES = ['Career & business', 'Health', 'Learning', 'Personal', 'Finance']

export interface GoalTemplate {
  name: string
  title: string
  category: string
  milestones: string[]
}

export const TEMPLATES: GoalTemplate[] = [
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

/** Creates a goal and its milestones in one atomic batch. A goal with a
 * targetCount is count-based and gets no milestones (same as the web app). */
export async function createGoal(input: {
  title: string
  category: string
  targetDate?: string
  targetCount?: number
  milestones: string[]
}) {
  const now = new Date().toISOString()
  const goalRef = doc(userCollection('goals'))
  const count = input.targetCount && input.targetCount > 0 ? input.targetCount : undefined
  const batch = writeBatch(db)

  batch.set(goalRef, {
    id: goalRef.id,
    title: input.title,
    category: input.category,
    targetDate: input.targetDate,
    createdAt: now,
    updatedAt: now,
    targetCount: count,
    currentCount: count ? 0 : undefined,
  })

  const milestones = count ? [] : input.milestones.map((m) => m.trim()).filter(Boolean)
  milestones.forEach((title, order) => {
    const ref = doc(userCollection('milestones'))
    batch.set(ref, { id: ref.id, goalId: goalRef.id, title, done: false, order, updatedAt: now })
  })

  await batch.commit()
}

export async function updateGoal(id: string, changes: Partial<Omit<Goal, 'id'>>) {
  await updateDoc(userDoc('goals', id), { ...changes, updatedAt: new Date().toISOString() })
}

/** Deletes a goal plus its milestones and tasks, revoking any XP they earned. */
export async function deleteGoal(goal: Goal) {
  const [milestones, tasks] = await Promise.all([
    getDocs(query(userCollection('milestones'), where('goalId', '==', goal.id))),
    getDocs(query(userCollection('tasks'), where('goalId', '==', goal.id))),
  ])
  const batch = writeBatch(db)
  milestones.docs.forEach((d) => {
    if (d.data().done) batch.delete(userDoc('xpEvents', `milestone_${d.id}`))
    batch.delete(d.ref)
  })
  tasks.docs.forEach((d) => {
    if (d.data().done) batch.delete(userDoc('xpEvents', `task_${d.id}`))
    batch.delete(d.ref)
  })
  batch.delete(userDoc('xpEvents', `goalCounter_${goal.id}`))
  batch.delete(userDoc('goals', goal.id))
  await batch.commit()
}

/** +1 / -1 toward a count-based goal. Awards the completion bonus once when
 * the count first reaches the target, and revokes it if it drops back. */
export async function stepGoalCounter(goal: Goal, delta: 1 | -1) {
  const target = goal.targetCount ?? 0
  const before = goal.currentCount ?? 0
  const after = Math.max(0, Math.min(target, before + delta))
  if (after === before) return

  await updateGoal(goal.id, { currentCount: after })

  const wasComplete = target > 0 && before >= target
  const isComplete = target > 0 && after >= target
  if (isComplete && !wasComplete) await awardXp('goalCounter', goal.id)
  else if (!isComplete && wasComplete) await revokeXp('goalCounter', goal.id)
}

export async function toggleMilestone(m: Milestone) {
  const done = !m.done
  await updateDoc(userDoc('milestones', m.id), { done, updatedAt: new Date().toISOString() })
  await (done ? awardXp('milestone', m.id) : revokeXp('milestone', m.id))
}

export async function renameMilestone(id: string, title: string) {
  await updateDoc(userDoc('milestones', id), { title, updatedAt: new Date().toISOString() })
}

export async function deleteMilestone(m: Milestone) {
  const tasks = await getDocs(query(userCollection('tasks'), where('milestoneId', '==', m.id)))
  const batch = writeBatch(db)
  tasks.docs.forEach((d) => {
    if (d.data().done) batch.delete(userDoc('xpEvents', `task_${d.id}`))
    batch.delete(d.ref)
  })
  batch.delete(userDoc('xpEvents', `milestone_${m.id}`))
  batch.delete(userDoc('milestones', m.id))
  await batch.commit()
}

export async function toggleTask(t: Task) {
  const done = !t.done
  await updateDoc(userDoc('tasks', t.id), { done, updatedAt: new Date().toISOString() })
  await (done ? awardXp('task', t.id) : revokeXp('task', t.id))
}
