import { deleteDoc, setDoc } from 'firebase/firestore'
import { userDoc } from './firestore'
import type { XpEvent } from './types'

// Ported from client/src/lib/xp.ts. Rewards are unchanged.
export const XP_REWARDS: Record<XpEvent['source'], number> = {
  task: 10,
  habit: 5,
  milestone: 50,
  journal: 15,
  quest: 25,
  boss: 75,
  goalCounter: 50,
}

// The doc id is derived from (source, refId), so awarding twice just
// overwrites the same doc — idempotent without needing a unique index.
function xpId(source: XpEvent['source'], refId: string) {
  return `${source}_${refId}`
}

export async function awardXp(source: XpEvent['source'], refId: string) {
  const id = xpId(source, refId)
  await setDoc(userDoc('xpEvents', id), {
    id,
    source,
    refId,
    amount: XP_REWARDS[source],
    createdAt: new Date().toISOString(),
  })
}

export async function revokeXp(source: XpEvent['source'], refId: string) {
  await deleteDoc(userDoc('xpEvents', xpId(source, refId)))
}

const XP_PER_LEVEL_BASE = 100

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
  nextRankLevel: number | null
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
