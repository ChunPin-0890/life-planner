import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { nanoid } from 'nanoid'
import { useNavigate } from 'react-router-dom'
import { db } from '../../lib/db'

function PinIcon({ filled }: { filled?: boolean }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill={filled ? 'var(--accent)' : 'none'}
      stroke={filled ? 'var(--accent)' : 'var(--text-3)'}
      strokeWidth={2}
    >
      <path d="M12 2l2 6 6 1-4.5 4.5L17 20l-5-3-5 3 1.5-6.5L4 9l6-1 2-6z" />
    </svg>
  )
}

function preview(body: string) {
  const firstLine = body.split('\n').find((l) => l.trim())
  if (!firstLine) return 'No additional text'
  return firstLine.replace(/^\[[ x]\]\s*/i, '')
}

export default function NotesPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [folder, setFolder] = useState<string>('all')

  // The North Star lives in this same table (see lib/northStar.ts) but has
  // its own dedicated card on the Goals page — never list it here too.
  const allNotes =
    (useLiveQuery(() => db.notes.orderBy('updatedAt').reverse().toArray()) ?? []).filter(
      (n) => n.folder !== '__north_star__',
    )
  const folders = Array.from(new Set(allNotes.map((n) => n.folder).filter(Boolean)))

  const filtered = allNotes.filter((n) => {
    if (folder !== 'all' && n.folder !== folder) return false
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
  })

  const pinned = filtered.filter((n) => n.pinned)
  const rest = filtered.filter((n) => !n.pinned)

  async function createNote() {
    const now = new Date().toISOString()
    const id = nanoid()
    await db.notes.add({
      id,
      title: '',
      body: '',
      folder: folder === 'all' ? '' : folder,
      pinned: false,
      createdAt: now,
      updatedAt: now,
    })
    navigate(`/notes/${id}`)
  }

  return (
    <div className="flex flex-col gap-4 p-5">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Notes</h1>
        <button
          onClick={createNote}
          aria-label="New note"
          className="animate-[badge-pop_0.3s_ease-out] flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-lg leading-none text-white"
        >
          +
        </button>
      </header>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search notes…"
        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
      />

      {folders.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFolder('all')}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              folder === 'all'
                ? 'bg-[var(--accent)] text-white'
                : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)]'
            }`}
          >
            All
          </button>
          {folders.map((f) => (
            <button
              key={f}
              onClick={() => setFolder(f)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                folder === f
                  ? 'bg-[var(--accent)] text-white'
                  : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-[var(--text-3)]">
          {query ? 'No notes match your search.' : 'No notes yet — tap + to capture your first one.'}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {pinned.length > 0 && (
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">Pinned</h2>
              <div className="flex flex-col gap-2">
                {pinned.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => navigate(`/notes/${n.id}`)}
                    className="flex flex-col gap-0.5 rounded-xl border border-[var(--border)] bg-[var(--accent-soft)] p-3.5 text-left"
                  >
                    <div className="flex items-center gap-1.5">
                      <PinIcon filled />
                      <span className="text-sm font-semibold">{n.title || 'Untitled'}</span>
                    </div>
                    <span className="line-clamp-1 text-xs text-[var(--text-2)]">{preview(n.body)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {rest.length > 0 && (
            <div>
              {pinned.length > 0 && (
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">Notes</h2>
              )}
              <div className="flex flex-col gap-2">
                {rest.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => navigate(`/notes/${n.id}`)}
                    className="flex flex-col gap-0.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 text-left"
                  >
                    <span className="text-sm font-semibold">{n.title || 'Untitled'}</span>
                    <span className="line-clamp-1 text-xs text-[var(--text-2)]">{preview(n.body)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
