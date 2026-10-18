import { nanoid } from 'nanoid'
import { db } from './db'
import { todayISO } from './date'

// Module-level locks: guard against React StrictMode invoking effects twice
// in dev, which would otherwise fire two concurrent calls that both see "0
// rows" before either finishes writing, duplicating every seed record. This
// check runs synchronously before the first `await`, so the second call is
// blocked immediately rather than racing.
//
// Deliberately NOT also gated by a localStorage flag: this runs once per
// logged-in account (after pullAll() populates Dexie from the server), and
// a flag that persists across accounts on the same browser would wrongly
// skip seeding for a second user who logs in on the same device.
let seeding = false
let seedingNotes = false

// Seeds a bit of demo data for a brand-new account so the app isn't a blank
// slate. Only inserts anything if every table is actually empty.
export async function seedIfEmpty() {
  if (seeding) return
  seeding = true

  try {
    const [goalCount, habitCount, taskCount, blockCount] = await Promise.all([
      db.goals.count(),
      db.habits.count(),
      db.tasks.count(),
      db.scheduleBlocks.count(),
    ])
    if (goalCount || habitCount || taskCount || blockCount) return

    const now = new Date().toISOString()
    const date = todayISO()

    const businessGoalId = nanoid()
    await db.goals.bulkAdd([
      {
        id: businessGoalId,
        title: 'Launch my consulting business',
        category: 'Career & business',
        targetDate: '2026-12-31',
        createdAt: now,
        updatedAt: now,
      },
      { id: nanoid(), title: 'Run a half marathon', category: 'Health', createdAt: now, updatedAt: now },
      { id: nanoid(), title: 'Finish UX design course', category: 'Learning', createdAt: now, updatedAt: now },
    ])

    const registerMilestoneId = nanoid()
    await db.milestones.bulkAdd([
      {
        id: nanoid(),
        goalId: businessGoalId,
        title: 'Validate idea with 10 prospects',
        done: true,
        order: 0,
        updatedAt: now,
      },
      {
        id: registerMilestoneId,
        goalId: businessGoalId,
        title: 'Register business & set up finances',
        done: false,
        order: 1,
        updatedAt: now,
      },
      {
        id: nanoid(),
        goalId: businessGoalId,
        title: 'Land first 3 paying clients',
        done: false,
        order: 2,
        updatedAt: now,
      },
      { id: nanoid(), goalId: businessGoalId, title: 'Replace salary income', done: false, order: 3, updatedAt: now },
    ])

    await db.tasks.bulkAdd([
      {
        id: nanoid(),
        title: 'Choose business structure',
        done: true,
        goalId: businessGoalId,
        milestoneId: registerMilestoneId,
        updatedAt: now,
      },
      {
        id: nanoid(),
        title: 'Open business bank account',
        done: false,
        goalId: businessGoalId,
        milestoneId: registerMilestoneId,
        updatedAt: now,
      },
      {
        id: nanoid(),
        title: 'Send invoice to Meridian Co.',
        done: false,
        dueDate: date,
        goalId: businessGoalId,
        milestoneId: registerMilestoneId,
        updatedAt: now,
      },
      { id: nanoid(), title: 'Book flights for conference', done: false, dueDate: date, updatedAt: now },
      { id: nanoid(), title: 'Read 20 pages', done: true, dueDate: date, updatedAt: now },
    ])

    await db.scheduleBlocks.bulkAdd([
      { id: nanoid(), date, startTime: '07:00', endTime: '07:30', title: 'Morning run', updatedAt: now },
      { id: nanoid(), date, startTime: '09:00', endTime: '10:00', title: 'Client strategy call', updatedAt: now },
      {
        id: nanoid(),
        date,
        startTime: '11:00',
        endTime: '13:00',
        title: 'Deep work — business plan',
        updatedAt: now,
      },
      { id: nanoid(), date, startTime: '14:00', endTime: '15:30', title: 'Gym + errands', updatedAt: now },
    ])

    const runHabitId = nanoid()
    const readHabitId = nanoid()
    const screenHabitId = nanoid()
    await db.habits.bulkAdd([
      { id: runHabitId, title: 'Morning run', frequency: 'daily', updatedAt: now },
      { id: readHabitId, title: 'Read 20 minutes', frequency: 'daily', updatedAt: now },
      { id: screenHabitId, title: 'No screens after 10pm', frequency: 'daily', updatedAt: now },
    ])

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - i)
      return todayISO(d)
    })
    const runPattern = [true, true, true, true, true, true, false]
    const readPattern = [true, true, false, true, true, true, false]
    await db.habitLogs.bulkAdd(
      last7Days.flatMap((d, i) => [
        { id: nanoid(), habitId: runHabitId, date: d, completed: runPattern[i] },
        { id: nanoid(), habitId: readHabitId, date: d, completed: readPattern[i] },
      ]),
    )

    await db.journalEntries.add({
      id: nanoid(),
      date,
      mood: 4,
      wins: 'Closed the client call and finally started the business plan doc.',
      challenges: '',
      tomorrowFocus: '',
      updatedAt: now,
    })

    await seedNotesIfEmpty(businessGoalId)
  } finally {
    seeding = false
  }
}

export async function seedNotesIfEmpty(businessGoalId?: string) {
  if (seedingNotes) return
  seedingNotes = true
  try {
    const count = await db.notes.count()
    if (count > 0) return

    const now = new Date().toISOString()
    await db.notes.bulkAdd([
      {
        id: nanoid(),
        title: 'Consulting business — pricing ideas',
        body: [
          'Rough pricing tiers to test with prospects:',
          '',
          '[ ] Hourly rate: $150/hr',
          '[ ] Project flat-fee package',
          '[ ] Monthly retainer for ongoing clients',
          '',
          'Ask Meridian Co. which model they prefer on the next call.',
        ].join('\n'),
        folder: 'Business',
        pinned: true,
        goalId: businessGoalId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: nanoid(),
        title: 'Books to read this year',
        body: '- Deep Work\n- The Almanack of Naval Ravikant\n- Atomic Habits (re-read)',
        folder: 'Reading',
        pinned: false,
        createdAt: now,
        updatedAt: now,
      },
    ])
  } finally {
    seedingNotes = false
  }
}
