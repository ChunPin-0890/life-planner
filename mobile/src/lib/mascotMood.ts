import { query, where } from 'firebase/firestore'
import { todayISO } from './date'
import { userCollection } from './firestore'
import { useLiveCollection } from './hooks'
import { useDailyQuests } from './quests'

export type MascotMood = 'happy' | 'neutral' | 'sad'

export interface MascotState {
  mood: MascotMood
  message: string
}

function yesterdayISO(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return todayISO(d)
}

/** Mascot expression from real progress (ported from the web client):
 * happy when today's quests are clear, sad when a daily habit was missed
 * yesterday or it's evening with nothing done, neutral otherwise. */
export function useMascotState(): MascotState {
  const { allDone, quests } = useDailyQuests()
  const anyProgress = quests.some((q) => q.current > 0)
  const yesterday = yesterdayISO()

  const habits = useLiveCollection(() => query(userCollection('habits'), where('frequency', '==', 'daily')), [])
  const yesterdayLogs = useLiveCollection(
    () => query(userCollection('habitLogs'), where('date', '==', yesterday)),
    [yesterday],
  )

  const completedYesterday = new Set(yesterdayLogs.filter((l) => l.completed).map((l) => l.habitId))
  // Only habits that existed yesterday can have been missed then.
  const broken = habits
    .filter((h) => todayISO(new Date(h.updatedAt)) <= yesterday)
    .filter((h) => !completedYesterday.has(h.id))

  if (allDone) return { mood: 'happy', message: "All quests cleared today — you're on fire!" }
  if (broken.length > 0) {
    return { mood: 'sad', message: `Missed ${broken[0].title} yesterday — its streak reset. Let's keep today's alive.` }
  }
  if (new Date().getHours() >= 18 && !anyProgress) {
    return { mood: 'sad', message: "Nothing logged yet today — there's still time." }
  }
  return { mood: 'neutral', message: 'Keep going — every bit of progress counts.' }
}
