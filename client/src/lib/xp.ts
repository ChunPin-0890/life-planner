import { nanoid } from 'nanoid'
import { db, type XpEvent } from './db'

// XP rewards per source. Milestones are the rarest, most meaningful unit of
// progress toward a goal, so they're weighted well above routine tasks/habits.
export const XP_REWARDS: Record<XpEvent['source'], number> = {
  task: 10,
  habit: 5,
  milestone: 50,
  journal: 15,
  quest: 25, // bonus for clearing every daily quest
  boss: 75, // bonus for defeating the week's chosen milestone "boss"
  goalCounter: 50, // completing a count-based goal (e.g. "chant 50 times") — same weight as a milestone
}

/** Award XP for completing something, once. Safe to call repeatedly — a
 * second award for the same (source, refId) is a no-op thanks to the
 * unique compound index. */
export async function awardXp(source: XpEvent['source'], refId: string) {
  try {
    await db.xpEvents.add({
      id: nanoid(),
      source,
      refId,
      amount: XP_REWARDS[source],
      createdAt: new Date().toISOString(),
    })
  } catch (err) {
    // Dexie throws ConstraintError on a duplicate unique key — expected
    // when something is already awarded; anything else should surface.
    if (!(err instanceof Error) || err.name !== 'ConstraintError') throw err
  }
}

/** Revoke previously-awarded XP when something is un-done. No-op if it was
 * never awarded. */
export async function revokeXp(source: XpEvent['source'], refId: string) {
  await db.xpEvents.where('[source+refId]').equals([source, refId]).delete()
}

export async function getTotalXp(): Promise<number> {
  const events = await db.xpEvents.toArray()
  return events.reduce((sum, e) => sum + e.amount, 0)
}

const XP_PER_LEVEL_BASE = 100

/** XP needed to go from `level` to `level + 1`. Grows linearly so each
 * level takes a bit longer than the last. */
function xpNeededForLevel(level: number): number {
  return XP_PER_LEVEL_BASE * level
}

export interface LevelInfo {
  level: number
  xpIntoLevel: number
  xpForNextLevel: number
  progress: number // 0–1
}

export function computeLevel(totalXp: number): LevelInfo {
  let level = 1
  let remaining = Math.max(0, totalXp)
  while (remaining >= xpNeededForLevel(level)) {
    remaining -= xpNeededForLevel(level)
    level++
  }
  const xpForNextLevel = xpNeededForLevel(level)
  return {
    level,
    xpIntoLevel: remaining,
    xpForNextLevel,
    progress: xpForNextLevel === 0 ? 0 : remaining / xpForNextLevel,
  }
}

// Solo Leveling-style rank, derived purely from level — E is the starting
// rank, S is the top. Each rank spans 5 levels except S, which is open-ended.
const RANKS = [
  { rank: 'E', minLevel: 1, name: 'E-Rank Hunter' },
  { rank: 'D', minLevel: 5, name: 'D-Rank Hunter' },
  { rank: 'C', minLevel: 10, name: 'C-Rank Hunter' },
  { rank: 'B', minLevel: 15, name: 'B-Rank Hunter' },
  { rank: 'A', minLevel: 20, name: 'A-Rank Hunter' },
  { rank: 'S', minLevel: 25, name: 'S-Rank Hunter' },
] as const

export interface RankInfo {
  rank: (typeof RANKS)[number]['rank']
  name: string
  nextRankLevel: number | null // null once at S, the top rank
}

export function computeRank(level: number): RankInfo {
  let current: (typeof RANKS)[number] = RANKS[0]
  for (const r of RANKS) {
    if (level >= r.minLevel) current = r
    else break
  }
  const next = RANKS.find((r) => r.minLevel > current.minLevel)
  return { rank: current.rank, name: current.name, nextRankLevel: next?.minLevel ?? null }
}
