import { setDoc } from 'firebase/firestore'
import { userDoc } from './firestore'
import type { JournalEntry } from './types'
import { awardXp } from './xp'

export const MOODS: { value: JournalEntry['mood']; label: string; emoji: string }[] = [
  { value: 1, label: 'Rough', emoji: '😣' },
  { value: 2, label: 'Meh', emoji: '😐' },
  { value: 3, label: 'Good', emoji: '🙂' },
  { value: 4, label: 'Great', emoji: '😄' },
  { value: 5, label: 'Amazing', emoji: '🤩' },
]

export type JournalField = 'wins' | 'challenges' | 'tomorrowFocus'

// One entry per day, so the date *is* the doc id. merge: true lets each
// field be saved on its own without a read-then-write, and creates the
// entry on first save.
function save(date: string, changes: Partial<JournalEntry>) {
  return setDoc(
    userDoc('journalEntries', date),
    { id: date, date, ...changes, updatedAt: new Date().toISOString() },
    { merge: true },
  )
}

export async function setMood(date: string, mood: JournalEntry['mood']) {
  await save(date, { mood })
  await awardXp('journal', date)
}

export async function saveJournalField(date: string, field: JournalField, value: string, hasMood: boolean) {
  // An entry needs a mood; default to "Good" (3) like the web app when the
  // user writes before picking one.
  await save(date, hasMood ? { [field]: value } : { [field]: value, mood: 3 })
  if (value.trim()) await awardXp('journal', date)
}

export function shiftDate(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00')
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
