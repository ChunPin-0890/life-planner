import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { useLevel } from '../components/LevelBadge'
import { useDailyQuests } from './quests'

export interface Achievement {
  id: string
  title: string
  description: string
  unlocked: boolean
}

const SEEN_KEY = 'life-planner:achievements-seen'

function getSeenIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]'))
  } catch {
    return new Set()
  }
}

function markSeen(ids: string[]) {
  const seen = getSeenIds()
  ids.forEach((id) => seen.add(id))
  localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]))
}

/** All achievements, computed live from real data — no separate table, same
 * pattern as daily quests. Add new ones here as the app grows. */
export function useAchievements(): Achievement[] {
  const { level } = useLevel()
  const tasksDoneCount = useLiveQuery(async () => (await db.tasks.toArray()).filter((t) => t.done).length) ?? 0
  const milestonesDoneCount =
    useLiveQuery(async () => (await db.milestones.toArray()).filter((m) => m.done).length) ?? 0
  const journalCount = useLiveQuery(() => db.journalEntries.count()) ?? 0
  const northStar = useLiveQuery(() =>
    db.notes.where('folder').equals('__north_star__').first(),
  )
  const bestHabitStreak =
    useLiveQuery(async () => {
      const logs = await db.habitLogs.toArray()
      const byHabit = new Map<string, number>()
      for (const l of logs) {
        if (!l.completed) continue
        byHabit.set(l.habitId, (byHabit.get(l.habitId) ?? 0) + 1)
      }
      return byHabit.size ? Math.max(...byHabit.values()) : 0
    }) ?? 0
  const { allDone: questsAllDone } = useDailyQuests()

  return [
    { id: 'first-task', title: 'First Blood', description: 'Complete your first task', unlocked: tasksDoneCount >= 1 },
    {
      id: 'first-milestone',
      title: 'Milestone Master',
      description: 'Complete your first milestone',
      unlocked: milestonesDoneCount >= 1,
    },
    {
      id: 'week-streak',
      title: 'Consistency',
      description: 'Hit a 7-day streak on any habit',
      unlocked: bestHabitStreak >= 7,
    },
    { id: 'journal-7', title: 'Journal Keeper', description: 'Write 7 journal entries', unlocked: journalCount >= 7 },
    { id: 'quest-clear', title: 'Quest Clear', description: 'Clear every daily quest in one day', unlocked: questsAllDone },
    { id: 'rank-d', title: 'Rank Up', description: 'Reach D-Rank (level 5)', unlocked: level >= 5 },
    {
      id: 'north-star',
      title: 'Dream Chaser',
      description: 'Write your North Star',
      unlocked: Boolean(northStar?.body?.trim()),
    },
  ]
}

/** Detects achievements that just became unlocked (weren't in the "seen"
 * set on a previous check) — drives the Duolingo-style unlock toast. Call
 * `dismiss()` once the toast has been shown to mark them seen. */
export function useNewlyUnlocked(achievements: Achievement[]) {
  const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement[]>([])

  useEffect(() => {
    const seen = getSeenIds()
    const fresh = achievements.filter((a) => a.unlocked && !seen.has(a.id))
    if (fresh.length) setNewlyUnlocked((prev) => [...prev, ...fresh.filter((f) => !prev.some((p) => p.id === f.id))])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [achievements.map((a) => `${a.id}:${a.unlocked}`).join(',')])

  function dismiss(id: string) {
    markSeen([id])
    setNewlyUnlocked((prev) => prev.filter((a) => a.id !== id))
  }

  return { newlyUnlocked, dismiss }
}
