import { deleteDoc, doc, setDoc, updateDoc } from 'firebase/firestore'
import { todayISO } from './date'
import { userCollection, userDoc } from './firestore'
import type { Note } from './types'

export const CHECKLIST_RE = /^\[( |x)\] (.*)$/i

export async function createNote(folder: string): Promise<string> {
  const ref = doc(userCollection('notes'))
  const now = new Date().toISOString()
  await setDoc(ref, { id: ref.id, title: '', body: '', folder, pinned: false, createdAt: now, updatedAt: now })
  return ref.id
}

export async function updateNote(id: string, fields: Partial<Pick<Note, 'title' | 'body' | 'folder' | 'pinned'>>) {
  await updateDoc(userDoc('notes', id), { ...fields, updatedAt: new Date().toISOString() })
}

export async function deleteNote(id: string) {
  await deleteDoc(userDoc('notes', id))
}

export async function sendLineToToday(text: string) {
  const ref = doc(userCollection('tasks'))
  await setDoc(ref, { id: ref.id, title: text, done: false, dueDate: todayISO(), updatedAt: new Date().toISOString() })
}

export function notePreview(body: string) {
  const firstLine = body.split('\n').find((l) => l.trim())
  if (!firstLine) return 'No additional text'
  return firstLine.replace(/^\[[ x]\]\s*/i, '')
}

export type FormatAction = 'bold' | 'italic' | 'bullet' | 'checklist'

/** Applies a toolbar action to `body` at the given selection; returns the
 * new text and where the selection should go. Same rules as the web
 * editor: bold/italic wrap the selection, bullet/checklist toggle a prefix
 * on the current line. */
export function applyFormat(body: string, start: number, end: number, action: FormatAction) {
  if (action === 'bold' || action === 'italic') {
    const marker = action === 'bold' ? '**' : '_'
    const inner = body.slice(start, end) || (action === 'bold' ? 'bold text' : 'italic text')
    const text = body.slice(0, start) + marker + inner + marker + body.slice(end)
    const selStart = start + marker.length
    return { text, selection: { start: selStart, end: selStart + inner.length } }
  }
  const lineStart = body.lastIndexOf('\n', start - 1) + 1
  const prefix = action === 'bullet' ? '- ' : '[ ] '
  if (body.slice(lineStart, lineStart + prefix.length) === prefix) {
    const pos = Math.max(lineStart, start - prefix.length)
    return { text: body.slice(0, lineStart) + body.slice(lineStart + prefix.length), selection: { start: pos, end: pos } }
  }
  const pos = start + prefix.length
  return { text: body.slice(0, lineStart) + prefix + body.slice(lineStart), selection: { start: pos, end: pos } }
}

export function toggleChecklistLine(body: string, lineIndex: number): string {
  const lines = body.split('\n')
  const match = lines[lineIndex]?.match(CHECKLIST_RE)
  if (!match) return body
  lines[lineIndex] = `[${match[1] === ' ' ? 'x' : ' '}] ${match[2]}`
  return lines.join('\n')
}
