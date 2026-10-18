import Dexie, { type EntityTable } from 'dexie'

export interface Goal {
  id: string
  title: string
  category: string
  targetDate?: string
  createdAt: string
  updatedAt: string
  // Count-based tracking (e.g. "Chant 50 times this month") as an
  // alternative to milestone checklists — when targetCount is set, the
  // goal's progress comes from currentCount/targetCount instead of
  // milestone completion ratio.
  targetCount?: number
  currentCount?: number
}

export interface Milestone {
  id: string
  goalId: string
  title: string
  done: boolean
  order: number
  updatedAt: string
}

export interface Task {
  id: string
  title: string
  done: boolean
  dueDate?: string // yyyy-mm-dd, for Today's to-do list
  goalId?: string
  milestoneId?: string
  updatedAt: string
  // Recurrence: a task with `recurring` set and no `dueDate` is a template
  // (never shown directly) that generates a dated instance each day it's
  // due — see lib/recurringTasks.ts. `templateId` on a generated instance
  // points back at the template that made it.
  recurring?: 'daily' | 'weekly'
  recurrenceWeekday?: number // 0=Sun..6=Sat, only meaningful when recurring==='weekly'
  templateId?: string
}

export interface Habit {
  id: string
  title: string
  frequency: 'daily' | 'weekly'
  updatedAt: string
  // Optional link to the Goal this habit is the recurring "way of
  // achieving" — e.g. "Meditate daily" in service of "Reduce stress".
  goalId?: string
}

export interface HabitLog {
  id: string
  habitId: string
  date: string // yyyy-mm-dd
  completed: boolean
}

export interface JournalEntry {
  id: string
  date: string // yyyy-mm-dd, one entry per day
  mood: 1 | 2 | 3 | 4 | 5
  wins: string
  challenges: string
  tomorrowFocus: string
  updatedAt: string
}

export interface ScheduleBlock {
  id: string
  date: string // yyyy-mm-dd
  startTime: string // HH:mm
  endTime: string // HH:mm
  title: string
  taskId?: string
  updatedAt: string
}

export interface Note {
  id: string
  title: string
  body: string // plain text; lines starting with "[ ] " / "[x] " render as checklist items
  folder: string // free-form, "" = no folder
  pinned: boolean
  goalId?: string
  createdAt: string
  updatedAt: string
}

// XP ledger: one event per completed thing, keyed uniquely by (source, refId)
// so re-checking/un-checking an item is idempotent — toggling something done
// awards XP once, toggling it back off revokes exactly that event. Totals are
// derived by summing the ledger rather than stored on a mutable counter, so
// they can never drift out of sync with what's actually been completed.
export interface XpEvent {
  id: string
  source: 'task' | 'habit' | 'milestone' | 'journal' | 'quest' | 'boss' | 'goalCounter'
  refId: string
  amount: number
  createdAt: string
}

class PlannerDB extends Dexie {
  goals!: EntityTable<Goal, 'id'>
  milestones!: EntityTable<Milestone, 'id'>
  tasks!: EntityTable<Task, 'id'>
  habits!: EntityTable<Habit, 'id'>
  habitLogs!: EntityTable<HabitLog, 'id'>
  journalEntries!: EntityTable<JournalEntry, 'id'>
  scheduleBlocks!: EntityTable<ScheduleBlock, 'id'>
  notes!: EntityTable<Note, 'id'>
  xpEvents!: EntityTable<XpEvent, 'id'>

  constructor() {
    super('life-planner')
    this.version(1).stores({
      goals: 'id, category, updatedAt',
      milestones: 'id, goalId, order',
      tasks: 'id, dueDate, goalId, milestoneId, done',
      habits: 'id, frequency',
      habitLogs: 'id, habitId, date, [habitId+date]',
      journalEntries: 'id, date',
      scheduleBlocks: 'id, date',
    })
    this.version(2).stores({
      notes: 'id, folder, pinned, goalId, updatedAt',
    })
    this.version(3).stores({
      xpEvents: 'id, &[source+refId]',
    })
    this.version(4).stores({
      habits: 'id, frequency, goalId',
    })
  }
}

export const db = new PlannerDB()

/** Wipes every local table — called on logout so a second account signing
 * in on the same browser/device never sees the previous account's data
 * still sitting in IndexedDB. */
export async function clearAllLocalData() {
  await db.transaction(
    'rw',
    [db.goals, db.milestones, db.tasks, db.habits, db.habitLogs, db.journalEntries, db.scheduleBlocks, db.notes, db.xpEvents],
    async () => {
      await Promise.all([
        db.goals.clear(),
        db.milestones.clear(),
        db.tasks.clear(),
        db.habits.clear(),
        db.habitLogs.clear(),
        db.journalEntries.clear(),
        db.scheduleBlocks.clear(),
        db.notes.clear(),
        db.xpEvents.clear(),
      ])
    },
  )
}
