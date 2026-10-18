import { db, type Goal } from './db'
import { awardXp, revokeXp } from './xp'

/** +1 (or -1) toward a count-based goal's target. Awards the completion
 * bonus exactly once when the count first reaches the target, and revokes
 * it if the count drops back below (idempotent via the goal's own id as
 * the XP ref, same pattern as milestones/tasks). */
export async function stepGoalCounter(goal: Goal, delta: 1 | -1) {
  const target = goal.targetCount ?? 0
  const before = goal.currentCount ?? 0
  const after = Math.max(0, Math.min(target, before + delta))
  if (after === before) return

  await db.goals.update(goal.id, { currentCount: after, updatedAt: new Date().toISOString() })

  const wasComplete = target > 0 && before >= target
  const isComplete = target > 0 && after >= target
  if (isComplete && !wasComplete) {
    await awardXp('goalCounter', goal.id)
  } else if (!isComplete && wasComplete) {
    await revokeXp('goalCounter', goal.id)
  }
}
