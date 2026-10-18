import { arrayUnion, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore'
import { todayISO } from './date'
import { userCollection, userDoc } from './firestore'
import type { Task } from './types'
import { revokeXp } from './xp'

export async function createTask(title: string) {
  const ref = doc(userCollection('tasks'))
  await setDoc(ref, { id: ref.id, title, done: false, dueDate: todayISO(), updatedAt: new Date().toISOString() })
}

export async function renameTask(id: string, title: string) {
  await updateDoc(userDoc('tasks', id), { title, updatedAt: new Date().toISOString() })
}

export async function deleteTask(task: Task) {
  if (task.done) await revokeXp('task', task.id)
  await deleteDoc(userDoc('tasks', task.id))
  // Deleting a recurring instance: remember the date on its template, or
  // ensureRecurringTasksForToday() would recreate it on the next visit.
  if (task.templateId && task.dueDate) {
    const tpl = userDoc('tasks', task.templateId)
    if ((await getDoc(tpl)).exists()) await updateDoc(tpl, { skipDates: arrayUnion(task.dueDate) })
  }
}

// --- Recurring tasks ---------------------------------------------------
// A template is a task with `recurring` set and no dueDate; it never shows
// on Today itself. Each day it's due, a dated instance is generated.

/** Instance ids are derived from (template, date), so two devices
 * generating today's tasks at once land on the same doc instead of
 * creating duplicates. */
function instanceId(templateId: string, date: string) {
  return `${templateId}_${date}`
}

/** Creates today's instance of every template due today, if missing. Cheap
 * to call on every Today mount. */
export async function ensureRecurringTasksForToday() {
  const date = todayISO()
  const weekday = new Date().getDay()
  const templates = await getDocs(query(userCollection('tasks'), where('recurring', 'in', ['daily', 'weekly'])))

  await Promise.all(
    templates.docs.map(async (d) => {
      const tpl = d.data()
      if (tpl.dueDate !== undefined) return
      if (tpl.recurring === 'weekly' && tpl.recurrenceWeekday !== weekday) return
      if (tpl.skipDates?.includes(date)) return

      const ref = userDoc('tasks', instanceId(tpl.id, date))
      // Check first: re-creating would reset an instance already ticked off.
      if ((await getDoc(ref)).exists()) return
      await setDoc(ref, {
        id: ref.id,
        title: tpl.title,
        done: false,
        dueDate: date,
        templateId: tpl.id,
        updatedAt: new Date().toISOString(),
      })
    }),
  )
}

export async function createRecurringTask(title: string, recurring: 'daily' | 'weekly') {
  const ref = doc(userCollection('tasks'))
  await setDoc(ref, {
    id: ref.id,
    title,
    done: false,
    recurring,
    recurrenceWeekday: recurring === 'weekly' ? new Date().getDay() : undefined,
    updatedAt: new Date().toISOString(),
  })
  await ensureRecurringTasksForToday()
}

/** Stops future instances; already-generated ones are kept. */
export async function stopRecurring(templateId: string) {
  await deleteDoc(userDoc('tasks', templateId))
}
