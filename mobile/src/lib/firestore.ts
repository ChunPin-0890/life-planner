import { collection, doc, type CollectionReference, type DocumentReference } from 'firebase/firestore'
import { auth, db } from './firebase'
import type {
  Goal,
  Habit,
  HabitLog,
  JournalEntry,
  Milestone,
  Note,
  ScheduleBlock,
  Task,
  XpEvent,
} from './types'

// Every user's data lives under users/{uid}/<collection>, so the security
// rules only need one "owner only" check (see firestore.rules).
interface Collections {
  goals: Goal
  milestones: Milestone
  tasks: Task
  habits: Habit
  habitLogs: HabitLog
  journalEntries: JournalEntry
  scheduleBlocks: ScheduleBlock
  notes: Note
  xpEvents: XpEvent
}

function requireUid(): string {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Not signed in')
  return uid
}

export function userCollection<K extends keyof Collections>(name: K) {
  return collection(db, 'users', requireUid(), name) as CollectionReference<Collections[K]>
}

export function userDoc<K extends keyof Collections>(name: K, id: string) {
  return doc(userCollection(name), id)
}

// Small per-user singleton docs that aren't part of the synced data model:
// users/{uid}/meta/{name}.
export interface MetaDocs {
  achievements: { unlocked: Record<string, string> } // achievement id -> ISO time first unlocked
  weeklyBoss: { weekKey: string; milestoneId: string }
  northStar: { body: string; updatedAt: string }
}

export function metaDoc<K extends keyof MetaDocs>(name: K) {
  return doc(db, 'users', requireUid(), 'meta', name) as DocumentReference<MetaDocs[K]>
}
