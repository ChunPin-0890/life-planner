import { db, type XpEvent } from './db'
import { api } from './api'
import { isAuthenticated } from './auth'

// Tables that sync 1:1 with a REST resource via upsert-by-id. xpEvents is
// handled separately below since it's idempotent by (source, refId), not id.
const SYNCED_TABLES = [
  'goals',
  'milestones',
  'tasks',
  'habits',
  'habitLogs',
  'journalEntries',
  'scheduleBlocks',
  'notes',
] as const

const RESOURCE_PATH: Record<(typeof SYNCED_TABLES)[number], string> = {
  goals: 'goals',
  milestones: 'milestones',
  tasks: 'tasks',
  habits: 'habits',
  habitLogs: 'habitlogs',
  journalEntries: 'journalentries',
  scheduleBlocks: 'scheduleblocks',
  notes: 'notes',
}

// Set while pullAll() is writing server data into Dexie, so the sync hooks
// below don't immediately push that same data straight back to the server.
let suppressPush = false

/** Fetch everything for the logged-in user and replace local Dexie data
 * with it. Called once on login/session-restore. Last-write-wins: this is
 * a full replace, not a merge — fine for a single-editor-per-account app,
 * not for true multi-device concurrent editing (see project notes). */
export async function pullAll() {
  if (!isAuthenticated()) return
  suppressPush = true
  try {
    for (const table of SYNCED_TABLES) {
      const { data } = await api.get(`/${RESOURCE_PATH[table]}`)
      await db.table(table).clear()
      if (data.length) await db.table(table).bulkPut(data)
    }
    const { data: xpEvents } = await api.get<XpEvent[]>('/xpevents')
    await db.xpEvents.clear()
    if (xpEvents.length) await db.xpEvents.bulkPut(xpEvents)
  } finally {
    suppressPush = false
  }
}

function pushUpsert(table: (typeof SYNCED_TABLES)[number], obj: Record<string, unknown>) {
  if (suppressPush || !isAuthenticated()) return
  api.put(`/${RESOURCE_PATH[table]}/${obj.id}`, obj).catch(() => {
    // Offline or the request failed — the local write already succeeded
    // (this app is local-first), so nothing is lost from the user's
    // perspective, but this change won't reach the server until something
    // else pushes it. A real retry queue is the natural next step if this
    // needs to be reliable over flaky connections.
  })
}

function pushDelete(table: (typeof SYNCED_TABLES)[number], id: string) {
  if (suppressPush || !isAuthenticated()) return
  api.delete(`/${RESOURCE_PATH[table]}/${id}`).catch(() => {})
}

/** Wires Dexie hooks so every local write to a synced table is transparently
 * pushed to the server — feature code (TodayPage, GoalsPage, etc.) never
 * needs to know sync exists. Call once at app start. */
export function registerSyncHooks() {
  for (const table of SYNCED_TABLES) {
    const t = db.table(table)

    t.hook('creating', (_primKey, obj, transaction) => {
      transaction.on('complete', () => pushUpsert(table, obj))
    })

    t.hook('updating', (modifications, _primKey, obj, transaction) => {
      transaction.on('complete', () => pushUpsert(table, { ...obj, ...modifications }))
    })

    t.hook('deleting', (_primKey, obj, transaction) => {
      transaction.on('complete', () => pushDelete(table, (obj as { id: string }).id))
    })
  }

  db.xpEvents.hook('creating', (_primKey, obj, transaction) => {
    transaction.on('complete', () => {
      if (suppressPush || !isAuthenticated()) return
      api.post('/xpevents/award', obj).catch(() => {})
    })
  })

  db.xpEvents.hook('deleting', (_primKey, obj, transaction) => {
    transaction.on('complete', () => {
      if (suppressPush || !isAuthenticated()) return
      const e = obj as XpEvent
      api.delete(`/xpevents/revoke?source=${e.source}&refId=${encodeURIComponent(e.refId)}`).catch(() => {})
    })
  })
}
