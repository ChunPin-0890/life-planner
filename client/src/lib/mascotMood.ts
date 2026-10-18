import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { useDailyQuests } from './quests'
import type { MascotMood } from '../components/Mascot'
import { todayISO } from './date'

function yesterdayISO(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return todayISO(d)
}

export interface MascotState {
  mood: MascotMood
  message: string
  brokenStreakHabits: string[] // titles of daily habits missed yesterday
}

/** Ties the mascot's expression to real progress: happy when today's
 * quests are cleared, sad when a daily habit's streak was broken yesterday
 * (the "consequence" for missing a day) or it's late with nothing done,
 * neutral otherwise. */
export function useMascotState(): MascotState {
  const { allDone, quests } = useDailyQuests()
  const anyProgress = quests.some((q) => q.current > 0)

  const dailyHabits = useLiveQuery(() => db.habits.where('frequency').equals('daily').toArray()) ?? []
  const yesterday = yesterdayISO()
  const yesterdayLogs = useLiveQuery(() => db.habitLogs.where('date').equals(yesterday).toArray(), [yesterday]) ?? []

  // A habit "broke its streak" if it existed yesterday (updatedAt on/before
  // yesterday) and wasn't logged completed that day.
  const brokenStreakHabits = dailyHabits
    .filter((h) => h.updatedAt.slice(0, 10) <= yesterday)
    .filter((h) => !yesterdayLogs.some((l) => l.habitId === h.id && l.completed))
    .map((h) => h.title)

  const hour = new Date().getHours()
  const isEvening = hour >= 18

  if (allDone) {
    return { mood: 'happy', message: "All quests cleared today — you're on fire!", brokenStreakHabits }
  }
  if (brokenStreakHabits.length > 0) {
    return {
      mood: 'sad',
      message: `Missed ${brokenStreakHabits[0]} yesterday — its streak reset. Let's keep today's alive.`,
      brokenStreakHabits,
    }
  }
  if (isEvening && !anyProgress) {
    return { mood: 'sad', message: "Nothing logged yet today — there's still time.", brokenStreakHabits }
  }
  return { mood: 'neutral', message: 'Keep going — every bit of progress counts.', brokenStreakHabits }
}
