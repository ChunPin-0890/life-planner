import { setDoc, updateDoc } from 'firebase/firestore'
import { useEffect } from 'react'
import { todayISO } from './date'
import { metaDoc, userCollection, userDoc } from './firestore'
import { useLiveCollectionState, useLiveDoc } from './hooks'
import type { Milestone } from './types'
import { awardXp } from './xp'

/** Monday of the current week (local time), as yyyy-mm-dd. */
export function currentWeekKey(): string {
  const d = new Date()
  const day = d.getDay() // 0 = Sunday
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return todayISO(d)
}

export interface BossState {
  milestone: (Milestone & { goalTitle: string }) | null
  weekKey: string
  /** Boss bonus already claimed this week — later bosses give milestone XP only. */
  bonusClaimed: boolean
}

/** One incomplete milestone framed as "this week's boss". The pick is
 * stored in users/{uid}/meta/weeklyBoss (the web app uses localStorage),
 * so it's the same boss on every device. */
export function useWeeklyBoss(): BossState {
  const weekKey = currentWeekKey()
  const milestones = useLiveCollectionState(() => userCollection('milestones'), [])
  const goals = useLiveCollectionState(() => userCollection('goals'), [])
  const stored = useLiveDoc(() => metaDoc('weeklyBoss'), [])
  const bonus = useLiveDoc(() => userDoc('xpEvents', `boss_${weekKey}`), [weekKey])
  const loaded = milestones.loaded && goals.loaded && stored.loaded

  const storedId = stored.data?.weekKey === weekKey ? stored.data.milestoneId : undefined
  let chosen = storedId ? milestones.items.find((m) => m.id === storedId && !m.done) : undefined
  if (!chosen) {
    // First incomplete milestone of the most recently updated goal.
    const sortedGoals = [...goals.items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    for (const g of sortedGoals) {
      chosen = milestones.items.filter((m) => m.goalId === g.id && !m.done).sort((a, b) => a.order - b.order)[0]
      if (chosen) break
    }
  }

  const chosenId = chosen?.id
  useEffect(() => {
    if (loaded && chosenId && chosenId !== storedId) {
      setDoc(metaDoc('weeklyBoss'), { weekKey, milestoneId: chosenId })
    }
  }, [loaded, chosenId, storedId, weekKey])

  if (!loaded || !chosen) return { milestone: null, weekKey, bonusClaimed: !!bonus.data }
  const goalTitle = goals.items.find((g) => g.id === chosen.goalId)?.title ?? ''
  return { milestone: { ...chosen, goalTitle }, weekKey, bonusClaimed: !!bonus.data }
}

export async function defeatBoss(milestoneId: string, weekKey: string) {
  await updateDoc(userDoc('milestones', milestoneId), { done: true, updatedAt: new Date().toISOString() })
  await awardXp('milestone', milestoneId)
  await awardXp('boss', weekKey)
}
