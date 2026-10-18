import { useLiveQuery } from 'dexie-react-hooks'
import { db, type JournalEntry } from './db'
import { todayISO } from './date'

function last7Dates(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return todayISO(d)
  })
}

export interface WeeklySummary {
  dates: string[]
  tasksCompleted: number
  habitConsistency: { habitId: string; title: string; percent: number }[]
  moodByDate: (JournalEntry['mood'] | null)[]
  averageMood: number | null
  xpEarned: number
  daysJournaled: number
}

export function useWeeklySummary(): WeeklySummary {
  const dates = last7Dates()
  const dateSet = new Set(dates)

  const tasks = useLiveQuery(() => db.tasks.toArray()) ?? []
  const tasksCompleted = tasks.filter((t) => t.done && t.dueDate && dateSet.has(t.dueDate)).length

  const dailyHabits = useLiveQuery(() => db.habits.where('frequency').equals('daily').toArray()) ?? []
  const habitLogs = useLiveQuery(() => db.habitLogs.toArray()) ?? []
  const habitConsistency = dailyHabits.map((h) => {
    const completedDays = dates.filter((d) => habitLogs.some((l) => l.habitId === h.id && l.date === d && l.completed))
      .length
    return { habitId: h.id, title: h.title, percent: Math.round((completedDays / dates.length) * 100) }
  })

  const journalEntries = useLiveQuery(() => db.journalEntries.toArray()) ?? []
  const entriesByDate = new Map(journalEntries.map((e) => [e.date, e]))
  const moodByDate = dates.map((d) => entriesByDate.get(d)?.mood ?? null)
  const moods = moodByDate.filter((m): m is JournalEntry['mood'] => m !== null)
  const averageMood = moods.length ? moods.reduce((s, m) => s + m, 0) / moods.length : null
  const daysJournaled = moods.length

  const xpEvents = useLiveQuery(() => db.xpEvents.toArray()) ?? []
  const xpEarned = xpEvents
    .filter((e) => dateSet.has(todayISO(new Date(e.createdAt))))
    .reduce((sum, e) => sum + e.amount, 0)

  return { dates, tasksCompleted, habitConsistency, moodByDate, averageMood, xpEarned, daysJournaled }
}
