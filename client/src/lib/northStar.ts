import { nanoid } from 'nanoid'
import { db } from './db'

// The North Star is stored as a reserved-folder Note rather than a new
// table — it already gets sync, offline support, and CRUD for free that
// way, and "one pinned freeform statement" is exactly what a Note is.
const NORTH_STAR_FOLDER = '__north_star__'

// Not a React hook despite reading like one at call sites — it's a plain
// query factory meant to be passed into useLiveQuery(getNorthStarNote).
export function getNorthStarNote() {
  return db.notes.where('folder').equals(NORTH_STAR_FOLDER).first()
}

export async function setNorthStar(statement: string) {
  const now = new Date().toISOString()
  const existing = await db.notes.where('folder').equals(NORTH_STAR_FOLDER).first()
  if (existing) {
    await db.notes.update(existing.id, { body: statement, updatedAt: now })
  } else {
    await db.notes.add({
      id: nanoid(),
      title: 'North Star',
      body: statement,
      folder: NORTH_STAR_FOLDER,
      pinned: true,
      createdAt: now,
      updatedAt: now,
    })
  }
}
