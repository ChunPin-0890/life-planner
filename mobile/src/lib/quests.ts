import { query, where } from 'firebase/firestore'
import { useEffect } from 'react'
import { todayISO } from './date'
import { userCollection, userDoc } from './firestore'
import { useLiveCollectionState, useLiveDoc } from './hooks'
import { awardXp, revokeXp } from './xp'

export interface Quest {
  id: string
  title: string
  current: number
  target: number
  done: boolean
}

/** Daily quests, derived live from today's data (ported from the web
 * client — nothing is stored besides the bonus XP event). */
export function useDailyQuests(): { quests: Quest[]; allDone: boolean; loaded: boolean } {
  const date = todayISO()

  const tasks = useLiveCollectionState(() => query(userCollection('tasks'), where('dueDate', '==', date)), [date])
  const habits = useLiveCollectionState(() => query(userCollection('habits'), where('frequency', '==', 'daily')), [])
  const logs = useLiveCollectionState(() => query(userCollection('habitLogs'), where('date', '==', date)), [date])
  const journal = useLiveDoc(() => userDoc('journalEntries', date), [date])
  const loaded = tasks.loaded && habits.loaded && logs.loaded && journal.loaded

  const tasksDone = tasks.items.filter((t) => t.done).length
  const tasksTarget = Math.min(3, Math.max(tasks.items.length, 1))

  const completedHabitIds = new Set(logs.items.filter((l) => l.completed).map((l) => l.habitId))
  const habitsDone = habits.items.filter((h) => completedHabitIds.has(h.id)).length

  const entry = journal.data
  const journalDone = Boolean(entry && (entry.wins?.trim() || entry.challenges?.trim() || entry.tomorrowFocus?.trim()))

  const quests: Quest[] = [
    {
      id: 'tasks',
      title: `Complete ${tasksTarget} task${tasksTarget === 1 ? '' : 's'}`,
      current: Math.min(tasksDone, tasksTarget),
      target: tasksTarget,
      done: tasksDone >= tasksTarget,
    },
    {
      id: 'habits',
      title: habits.items.length ? 'Check off every daily habit' : 'No daily habits yet',
      current: habitsDone,
      target: Math.max(habits.items.length, 1),
      done: habits.items.length === 0 || habitsDone >= habits.items.length,
    },
    { id: 'journal', title: 'Write in your journal', current: journalDone ? 1 : 0, target: 1, done: journalDone },
  ]

  const allDone = loaded && quests.every((q) => q.done)

  // Award the bonus while every quest is clear; revoke if something is
  // un-done later. Gated on `loaded` so the empty pre-snapshot state never
  // revokes a bonus that was legitimately earned.
  useEffect(() => {
    if (!loaded) return
    if (allDone) awardXp('quest', date)
    else revokeXp('quest', date)
  }, [loaded, allDone, date])

  return { quests, allDone, loaded }
}
