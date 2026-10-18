import { limit, query, setDoc, where } from 'firebase/firestore'
import { useEffect } from 'react'
import { metaDoc, userCollection } from './firestore'
import { useLiveCollection, useLiveCollectionState, useLiveDoc } from './hooks'
import { useDailyQuests } from './quests'
import type { HabitLog } from './types'
import { computeLevel } from './xp'

export interface Achievement {
  id: string
  title: string
  description: string
  unlocked: boolean
}

const DEFINITIONS = [
  { id: 'first-task', title: 'First Blood', description: 'Complete your first task' },
  { id: 'first-milestone', title: 'Milestone Master', description: 'Complete your first milestone' },
  { id: 'week-streak', title: 'Consistency', description: 'Hit a 7-day streak on any habit' },
  { id: 'journal-7', title: 'Journal Keeper', description: 'Write 7 journal entries' },
  { id: 'quest-clear', title: 'Quest Clear', description: 'Clear every daily quest in one day' },
  { id: 'rank-d', title: 'Rank Up', description: 'Reach D-Rank (level 5)' },
  { id: 'north-star', title: 'Dream Chaser', description: 'Write your North Star' },
] as const

type AchievementId = (typeof DEFINITIONS)[number]['id']

/** Longest run of consecutive completed days for any single habit. */
function bestStreak(logs: HabitLog[]): number {
  const daysByHabit = new Map<string, string[]>()
  for (const l of logs) daysByHabit.set(l.habitId, [...(daysByHabit.get(l.habitId) ?? []), l.date])
  let best = 0
  for (const days of daysByHabit.values()) {
    const sorted = [...new Set(days)].sort()
    let run = 0
    let prev: number | null = null
    for (const d of sorted) {
      const t = new Date(d + 'T00:00:00').getTime()
      // ~1 day apart (tolerates DST shifts)
      run = prev !== null && Math.round((t - prev) / 86_400_000) === 1 ? run + 1 : 1
      best = Math.max(best, run)
      prev = t
    }
  }
  return best
}

/** Live conditions for each achievement. Each query is capped at what the
 * condition needs, so this stays cheap on Firestore reads. */
function useConditions(): { conditions: Record<AchievementId, boolean>; loaded: boolean } {
  const doneTasks = useLiveCollectionState(() => query(userCollection('tasks'), where('done', '==', true), limit(1)), [])
  const doneMilestones = useLiveCollectionState(
    () => query(userCollection('milestones'), where('done', '==', true), limit(1)),
    [],
  )
  const journal = useLiveCollectionState(() => query(userCollection('journalEntries'), limit(7)), [])
  const logs = useLiveCollectionState(() => query(userCollection('habitLogs'), where('completed', '==', true)), [])
  const xpEvents = useLiveCollection(() => userCollection('xpEvents'), [])
  const northStar = useLiveDoc(() => metaDoc('northStar'), [])
  const quests = useDailyQuests()

  const level = computeLevel(xpEvents.reduce((s, e) => s + e.amount, 0)).level
  const loaded =
    doneTasks.loaded && doneMilestones.loaded && journal.loaded && logs.loaded && northStar.loaded && quests.loaded

  return {
    loaded,
    conditions: {
      'first-task': doneTasks.items.length >= 1,
      'first-milestone': doneMilestones.items.length >= 1,
      'week-streak': bestStreak(logs.items) >= 7,
      'journal-7': journal.items.length >= 7,
      'quest-clear': quests.allDone,
      'rank-d': level >= 5,
      'north-star': Boolean(northStar.data?.body?.trim()),
    },
  }
}

/** Achievements for display. Once earned, an achievement stays unlocked
 * (stored in users/{uid}/meta/achievements) even if its live condition
 * later stops holding — e.g. "Quest Clear" the next morning. */
export function useAchievements(): Achievement[] {
  const stored = useLiveDoc(() => metaDoc('achievements'), [])
  const unlocked = stored.data?.unlocked ?? {}
  return DEFINITIONS.map((d) => ({ ...d, unlocked: d.id in unlocked }))
}

/** Mount once (in the tabs layout). Records newly met achievements and
 * calls `onUnlock` for each so the UI can celebrate. */
export function useAchievementWatcher(onUnlock: (a: Achievement) => void) {
  const { conditions, loaded } = useConditions()
  const stored = useLiveDoc(() => metaDoc('achievements'), [])
  const fresh = loaded && stored.loaded
    ? DEFINITIONS.filter((d) => conditions[d.id] && !(d.id in (stored.data?.unlocked ?? {})))
    : []
  const freshKey = fresh.map((d) => d.id).join(',')

  useEffect(() => {
    if (!freshKey) return
    const now = new Date().toISOString()
    const ids = freshKey.split(',')
    setDoc(metaDoc('achievements'), { unlocked: Object.fromEntries(ids.map((id) => [id, now])) }, { merge: true })
    ids.forEach((id) => {
      const def = DEFINITIONS.find((d) => d.id === id)
      if (def) onUnlock({ ...def, unlocked: true })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freshKey])
}
