import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { todayISO } from './date'
import { awardXp, revokeXp } from './xp'

export interface Quest {
  id: string
  title: string
  current: number
  target: number
  done: boolean
}

/** Daily quests are derived live from today's actual data — nothing is
 * stored separately, so there's no separate "quest" table to keep in sync.
 * Each one maps to a real habit of the app (finish tasks, keep habits,
 * reflect) rather than being an arbitrary checklist. */
export function useDailyQuests(): { quests: Quest[]; allDone: boolean } {
  const date = todayISO()

  const tasks = useLiveQuery(() => db.tasks.where('dueDate').equals(date).toArray(), [date]) ?? []
  const dailyHabits = useLiveQuery(() => db.habits.where('frequency').equals('daily').toArray()) ?? []
  const habitLogs =
    useLiveQuery(() => db.habitLogs.where('date').equals(date).toArray(), [date]) ?? []
  const journalEntry = useLiveQuery(() => db.journalEntries.where('date').equals(date).first(), [date])

  const tasksDone = tasks.filter((t) => t.done).length
  const tasksTarget = Math.min(3, Math.max(tasks.length, 1))

  const habitsCompletedToday = dailyHabits.filter((h) =>
    habitLogs.some((l) => l.habitId === h.id && l.completed),
  ).length

  const journalDone = Boolean(
    journalEntry && (journalEntry.wins.trim() || journalEntry.challenges.trim() || journalEntry.tomorrowFocus.trim()),
  )

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
      title: dailyHabits.length ? 'Check off every daily habit' : 'No daily habits yet',
      current: habitsCompletedToday,
      target: Math.max(dailyHabits.length, 1),
      done: dailyHabits.length === 0 || habitsCompletedToday >= dailyHabits.length,
    },
    {
      id: 'journal',
      title: 'Write in your journal',
      current: journalDone ? 1 : 0,
      target: 1,
      done: journalDone,
    },
  ]

  const allDone = quests.every((q) => q.done)

  // Award the bonus once per day, the moment all quests are cleared; revoke
  // if something gets un-done afterward (e.g. un-checking a task) so it
  // stays consistent with what's actually complete right now.
  useEffect(() => {
    if (allDone) {
      awardXp('quest', date)
    } else {
      revokeXp('quest', date)
    }
  }, [allDone, date])

  return { quests, allDone }
}
