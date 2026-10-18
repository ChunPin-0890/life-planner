import { deleteField, doc, getDocs, query, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore'
import { todayISO } from './date'
import { db } from './firebase'
import { userCollection, userDoc } from './firestore'
import type { Habit, HabitLog } from './types'
import { awardXp, revokeXp } from './xp'

// One log per habit per day, so the doc id is derived from both — toggling
// twice can never create a duplicate log for the same day.
function logId(habitId: string, date: string) {
  return `${habitId}_${date}`
}

export async function createHabit(input: { title: string; frequency: Habit['frequency']; goalId?: string }) {
  const ref = doc(userCollection('habits'))
  await setDoc(ref, { id: ref.id, ...input, updatedAt: new Date().toISOString() })
}

export async function updateHabit(id: string, changes: { title?: string; frequency?: Habit['frequency']; goalId?: string | null }) {
  const { goalId, ...rest } = changes
  await updateDoc(userDoc('habits', id), {
    ...rest,
    // null means "unlink from goal" — remove the field rather than store null.
    ...(goalId === null ? { goalId: deleteField() } : goalId ? { goalId } : {}),
    updatedAt: new Date().toISOString(),
  })
}

export async function deleteHabit(habitId: string) {
  const logs = await getDocs(query(userCollection('habitLogs'), where('habitId', '==', habitId)))
  const batch = writeBatch(db)
  logs.docs.forEach((d) => {
    const log = d.data()
    if (log.completed) batch.delete(userDoc('xpEvents', `habit_${habitId}:${log.date}`))
    batch.delete(d.ref)
  })
  batch.delete(userDoc('habits', habitId))
  await batch.commit()
}

/** Toggles today's completion for a habit, awarding/revoking its XP. */
export async function toggleHabitToday(habitId: string, current: HabitLog | undefined) {
  const today = todayISO()
  const completed = !current?.completed
  const id = logId(habitId, today)
  await setDoc(userDoc('habitLogs', id), { id, habitId, date: today, completed })
  const xpRefId = `${habitId}:${today}`
  await (completed ? awardXp('habit', xpRefId) : revokeXp('habit', xpRefId))
}

/** Consecutive completed days ending today (or yesterday, so an unchecked
 * today doesn't zero the streak before the day is over). */
export function currentStreak(logs: HabitLog[]): number {
  const done = new Set(logs.filter((l) => l.completed).map((l) => l.date))
  const day = new Date()
  if (!done.has(todayISO(day))) day.setDate(day.getDate() - 1)
  let streak = 0
  while (done.has(todayISO(day))) {
    streak++
    day.setDate(day.getDate() - 1)
  }
  return streak
}

export function lastNDates(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (n - 1 - i))
    return todayISO(d)
  })
}
