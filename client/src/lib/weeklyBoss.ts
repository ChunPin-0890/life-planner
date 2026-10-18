import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Milestone, type Goal } from './db'
import { awardXp, revokeXp } from './xp'
import { todayISO } from './date'

const BOSS_KEY_PREFIX = 'life-planner:boss:'

/** Monday of the current week, as yyyy-mm-dd — stable key for "this week". */
function currentWeekKey(): string {
  const d = new Date()
  const day = d.getDay() // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diffToMonday)
  return todayISO(d)
}

export interface BossState {
  milestone: (Milestone & { goalTitle: string }) | null
  weekKey: string
}

/** Picks one incomplete milestone as "this week's boss" — stable for the
 * week (stored in localStorage by week key), auto-advancing to a new one
 * once defeated or once the week rolls over. No schema change: it's a
 * client-side framing over the existing Milestone data. */
export function useWeeklyBoss(): BossState {
  const weekKey = currentWeekKey()
  const milestones = useLiveQuery(() => db.milestones.toArray()) ?? []
  const goals = useLiveQuery(() => db.goals.toArray()) ?? []
  const goalById = new Map<string, Goal>(goals.map((g) => [g.id, g]))

  const storageKey = BOSS_KEY_PREFIX + weekKey
  let chosenId = localStorage.getItem(storageKey)

  let chosen = chosenId ? milestones.find((m) => m.id === chosenId && !m.done) : undefined
  if (!chosen) {
    // Pick the first incomplete milestone, most-recently-updated goal first.
    const sortedGoals = [...goals].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    for (const g of sortedGoals) {
      const candidate = milestones
        .filter((m) => m.goalId === g.id && !m.done)
        .sort((a, b) => a.order - b.order)[0]
      if (candidate) {
        chosen = candidate
        break
      }
    }
    if (chosen) localStorage.setItem(storageKey, chosen.id)
  }

  if (!chosen) return { milestone: null, weekKey }
  const goalTitle = goalById.get(chosen.goalId)?.title ?? ''
  return { milestone: { ...chosen, goalTitle }, weekKey }
}

export async function defeatBoss(milestoneId: string, weekKey: string, currentlyDone: boolean) {
  await db.milestones.update(milestoneId, { done: !currentlyDone, updatedAt: new Date().toISOString() })
  if (!currentlyDone) {
    await awardXp('milestone', milestoneId)
    await awardXp('boss', weekKey)
  } else {
    await revokeXp('milestone', milestoneId)
    await revokeXp('boss', weekKey)
  }
}
