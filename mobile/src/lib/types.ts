// Data model ported from client/src/lib/db.ts. Each type maps to a Firestore
// subcollection under users/{uid}/ — see collections in firestore.ts.

export interface Goal {
  id: string
  title: string
  category: string
  targetDate?: string
  createdAt: string
  updatedAt: string
  // Count-based tracking (e.g. "Chant 50 times this month") as an
  // alternative to milestone checklists.
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
  dueDate?: string // yyyy-mm-dd
  goalId?: string
  milestoneId?: string
  updatedAt: string
  recurring?: 'daily' | 'weekly'
  recurrenceWeekday?: number // 0=Sun..6=Sat
  templateId?: string
  // On a template: dates whose instance the user deleted, so it isn't
  // regenerated the next time Today loads.
  skipDates?: string[]
}

export interface Habit {
  id: string
  title: string
  frequency: 'daily' | 'weekly'
  updatedAt: string
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
  date: string
  startTime: string // HH:mm
  endTime: string // HH:mm
  title: string
  taskId?: string
  updatedAt: string
}

export interface Note {
  id: string
  title: string
  body: string
  folder: string
  pinned: boolean
  goalId?: string
  createdAt: string
  updatedAt: string
}

export interface XpEvent {
  id: string
  source: 'task' | 'habit' | 'milestone' | 'journal' | 'quest' | 'boss' | 'goalCounter'
  refId: string
  amount: number
  createdAt: string
}
