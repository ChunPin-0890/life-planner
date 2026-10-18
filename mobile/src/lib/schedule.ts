import { deleteDoc, doc, setDoc, updateDoc } from 'firebase/firestore'
import { todayISO } from './date'
import { userCollection, userDoc } from './firestore'

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

/** Accepts "9:00", "09:00", "900" or "0900"; returns "HH:mm" or null. */
export function normalizeTime(input: string): string | null {
  const digits = input.replace(/\D/g, '')
  if (digits.length < 3 || digits.length > 4) return null
  const t = digits.padStart(4, '0')
  const out = `${t.slice(0, 2)}:${t.slice(2)}`
  return TIME_RE.test(out) ? out : null
}

/** Validates a start/end pair; returns an error message or the normalized times. */
export function validateTimes(start: string, end: string): { error: string } | { start: string; end: string } {
  const s = normalizeTime(start)
  const e = normalizeTime(end)
  if (!s || !e) return { error: 'Use 24-hour times like 09:00 or 14:30.' }
  if (e <= s) return { error: 'End time must be after start time.' }
  return { start: s, end: e }
}

export function to12h(time: string) {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${hour} ${period}` : `${hour}:${String(m).padStart(2, '0')} ${period}`
}

export async function createBlock(title: string, startTime: string, endTime: string) {
  const ref = doc(userCollection('scheduleBlocks'))
  await setDoc(ref, { id: ref.id, date: todayISO(), title, startTime, endTime, updatedAt: new Date().toISOString() })
}

export async function updateBlock(id: string, fields: { title?: string; startTime?: string; endTime?: string }) {
  await updateDoc(userDoc('scheduleBlocks', id), { ...fields, updatedAt: new Date().toISOString() })
}

export async function deleteBlock(id: string) {
  await deleteDoc(userDoc('scheduleBlocks', id))
}
