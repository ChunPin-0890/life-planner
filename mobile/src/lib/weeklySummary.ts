import { query, where } from 'firebase/firestore'
import { todayISO } from './date'
import { userCollection } from './firestore'
import { lastNDates } from './habits'
import { useLiveCollection } from './hooks'
import type { JournalEntry } from './types'

export interface WeeklySummary {
  dates: string[]
  tasksCompleted: number
  habitConsistency: { habitId: string; title: string; percent: number }[]
  moodByDate: (JournalEntry['mood'] | null)[]
  averageMood: number | null
  xpEarned: number
  daysJournaled: number
}

/** Stats for the last 7 days (today included). Unlike the web version,
 * each query only fetches the 7-day window rather than whole collections —
 * on Firestore every document read is billed. */
export function useWeeklySummary(): WeeklySummary {
  const dates = lastNDates(7)
  const start = dates[0]
  const dateSet = new Set(dates)

  const tasks = useLiveCollection(() => query(userCollection('tasks'), where('dueDate', '>=', start)), [start])
  const habits = useLiveCollection(() => query(userCollection('habits'), where('frequency', '==', 'daily')), [])
  const habitLogs = useLiveCollection(() => query(userCollection('habitLogs'), where('date', '>=', start)), [start])
  const entries = useLiveCollection(() => query(userCollection('journalEntries'), where('date', '>=', start)), [start])
  // createdAt is a UTC ISO string, so compare against local midnight
  // converted to UTC — otherwise the window is off by the timezone offset.
  const startInstant = new Date(start + 'T00:00:00').toISOString()
  const xpEvents = useLiveCollection(
    () => query(userCollection('xpEvents'), where('createdAt', '>=', startInstant)),
    [startInstant],
  )

  const tasksCompleted = tasks.filter((t) => t.done && t.dueDate && dateSet.has(t.dueDate)).length

  const completedLogs = new Set(habitLogs.filter((l) => l.completed).map((l) => `${l.habitId}_${l.date}`))
  const habitConsistency = habits.map((h) => {
    const days = dates.filter((d) => completedLogs.has(`${h.id}_${d}`)).length
    return { habitId: h.id, title: h.title, percent: Math.round((days / dates.length) * 100) }
  })

  const entriesByDate = new Map(entries.map((e) => [e.date, e]))
  const moodByDate = dates.map((d) => entriesByDate.get(d)?.mood ?? null)
  const moods = moodByDate.filter((m): m is JournalEntry['mood'] => m !== null)
  const averageMood = moods.length ? moods.reduce((s, m) => s + m, 0) / moods.length : null

  const xpEarned = xpEvents
    .filter((e) => dateSet.has(todayISO(new Date(e.createdAt))))
    .reduce((sum, e) => sum + e.amount, 0)

  return { dates, tasksCompleted, habitConsistency, moodByDate, averageMood, xpEarned, daysJournaled: moods.length }
}
