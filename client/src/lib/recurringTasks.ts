import { nanoid } from 'nanoid'
import { db } from './db'
import { todayISO } from './date'

/** For every recurring template task (recurring set, no dueDate), creates
 * today's instance if today matches its schedule and one doesn't already
 * exist. Call on app load and whenever Today mounts — cheap no-op if
 * nothing needs generating. */
export async function ensureRecurringTasksForToday() {
  const date = todayISO()
  const weekday = new Date().getDay()

  const templates = (await db.tasks.toArray()).filter((t) => t.recurring && t.dueDate === undefined)

  for (const tpl of templates) {
    if (tpl.recurring === 'weekly' && tpl.recurrenceWeekday !== weekday) continue

    const todaysInstances = await db.tasks.where('dueDate').equals(date).toArray()
    const alreadyExists = todaysInstances.some((t) => t.templateId === tpl.id)
    if (alreadyExists) continue

    await db.tasks.add({
      id: nanoid(),
      title: tpl.title,
      done: false,
      dueDate: date,
      templateId: tpl.id,
      updatedAt: new Date().toISOString(),
    })
  }
}

/** Creates a new recurring template and immediately generates today's
 * instance (so the user sees it appear right away instead of waiting for
 * the next day). */
export async function createRecurringTask(title: string, recurring: 'daily' | 'weekly') {
  const now = new Date().toISOString()
  const templateId = nanoid()
  await db.tasks.add({
    id: templateId,
    title,
    done: false,
    recurring,
    recurrenceWeekday: recurring === 'weekly' ? new Date().getDay() : undefined,
    updatedAt: now,
  })
  await ensureRecurringTasksForToday()
}

/** Stops future generation from a template (e.g. the one behind a given
 * instance) without touching any already-generated instances. */
export async function stopRecurring(templateId: string) {
  await db.tasks.delete(templateId)
}
