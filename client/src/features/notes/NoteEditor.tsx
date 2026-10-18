import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { nanoid } from 'nanoid'
import { useNavigate, useParams } from 'react-router-dom'
import { db } from '../../lib/db'
import { todayISO } from '../../lib/date'
import FormattedText from '../../components/FormattedText'

const CHECKLIST_RE = /^\[( |x)\] (.*)$/i

type ToolbarAction = 'bold' | 'italic' | 'bullet' | 'checklist'

function BoldIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
      <path d="M6 4h7a3.5 3.5 0 0 1 0 7H6zM6 11h8a3.5 3.5 0 0 1 0 7H6z" />
    </svg>
  )
}
function ItalicIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
      <path d="M11 4h6M7 20h6M14 4L10 20" />
    </svg>
  )
}
function BulletIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
      <circle cx="4" cy="6" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1.3" fill="currentColor" stroke="none" />
      <path d="M9 6h11M9 12h11M9 18h11" />
    </svg>
  )
}
function ChecklistIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
      <path d="M4 6l1.5 1.5L8 5" />
      <path d="M12 6h9" />
      <path d="M4 13l1.5 1.5L8 12" />
      <path d="M12 13h9" />
      <path d="M4 20l1.5 1.5L8 19" />
      <path d="M12 20h9" />
    </svg>
  )
}

function PinIcon({ filled }: { filled?: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? 'var(--accent)' : 'none'}
      stroke={filled ? 'var(--accent)' : 'var(--text-2)'}
      strokeWidth={2}
    >
      <path d="M12 2l2 6 6 1-4.5 4.5L17 20l-5-3-5 3 1.5-6.5L4 9l6-1 2-6z" />
    </svg>
  )
}

export default function NoteEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const note = useLiveQuery(() => (id ? db.notes.get(id) : undefined), [id])

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [folder, setFolder] = useState('')
  const [loaded, setLoaded] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (note && !loaded) {
      setTitle(note.title)
      setBody(note.body)
      setFolder(note.folder)
      setLoaded(true)
    }
  }, [note, loaded])

  async function save(fields: Partial<{ title: string; body: string; folder: string; pinned: boolean }>) {
    if (!id) return
    await db.notes.update(id, { ...fields, updatedAt: new Date().toISOString() })
  }

  async function togglePin() {
    if (!note) return
    await save({ pinned: !note.pinned })
  }

  async function deleteNote() {
    if (!id) return
    await db.notes.delete(id)
    navigate('/notes')
  }

  function toggleChecklistLine(lineIndex: number) {
    const lines = body.split('\n')
    const match = lines[lineIndex].match(CHECKLIST_RE)
    if (!match) return
    lines[lineIndex] = `[${match[1] === ' ' ? 'x' : ' '}] ${match[2]}`
    const next = lines.join('\n')
    setBody(next)
    save({ body: next })
  }

  function applyFormat(action: ToolbarAction) {
    const el = textareaRef.current
    if (!el) return
    const { selectionStart: start, selectionEnd: end } = el
    const selected = body.slice(start, end)

    let next: string
    let cursorStart: number
    let cursorEnd: number

    if (action === 'bold' || action === 'italic') {
      const marker = action === 'bold' ? '**' : '_'
      const inner = selected || (action === 'bold' ? 'bold text' : 'italic text')
      const replacement = `${marker}${inner}${marker}`
      next = body.slice(0, start) + replacement + body.slice(end)
      cursorStart = start + marker.length
      cursorEnd = cursorStart + inner.length
    } else {
      // Line-prefix actions (bullet/checklist): apply to the start of the
      // current line, not the cursor position, so it reads naturally.
      const lineStart = body.lastIndexOf('\n', start - 1) + 1
      const prefix = action === 'bullet' ? '- ' : '[ ] '
      const already = body.slice(lineStart, lineStart + prefix.length) === prefix
      if (already) {
        next = body.slice(0, lineStart) + body.slice(lineStart + prefix.length)
        cursorStart = cursorEnd = Math.max(lineStart, start - prefix.length)
      } else {
        next = body.slice(0, lineStart) + prefix + body.slice(lineStart)
        cursorStart = cursorEnd = start + prefix.length
      }
    }

    setBody(next)
    save({ body: next })
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(cursorStart, cursorEnd)
    })
  }

  async function sendLineToToday(text: string) {
    await db.tasks.add({
      id: nanoid(),
      title: text,
      done: false,
      dueDate: todayISO(),
      updatedAt: new Date().toISOString(),
    })
  }

  if (!note) {
    return <div className="p-5 text-sm text-[var(--text-3)]">Loading…</div>
  }

  const lines = body.split('\n')

  return (
    <div className="flex flex-col gap-4 p-5">
      <header className="flex items-center justify-between">
        <button
          onClick={() => navigate('/notes')}
          className="flex items-center gap-1 text-sm font-medium text-[var(--accent)]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.3}>
            <path d="M15 6l-6 6 6 6" />
          </svg>
          Notes
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={togglePin}
            aria-label={note.pinned ? 'Unpin' : 'Pin'}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-[var(--surface-2)]"
          >
            <PinIcon filled={note.pinned} />
          </button>
          <button
            onClick={deleteNote}
            aria-label="Delete note"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-2)] hover:bg-[var(--surface-2)]"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M4 7h16M9 7V4h6v3M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
            </svg>
          </button>
        </div>
      </header>

      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value)
          save({ title: e.target.value })
        }}
        placeholder="Title"
        className="bg-transparent text-lg font-bold outline-none placeholder:text-[var(--text-3)]"
      />

      <input
        value={folder}
        onChange={(e) => {
          setFolder(e.target.value)
          save({ folder: e.target.value })
        }}
        placeholder="Folder (optional)"
        className="w-fit rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs text-[var(--text-2)] outline-none focus:border-[var(--accent)]"
      />

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center gap-1 border-b border-[var(--border)] px-2 py-1.5">
          {(
            [
              ['bold', BoldIcon, 'Bold'],
              ['italic', ItalicIcon, 'Italic'],
              ['bullet', BulletIcon, 'Bullet list'],
              ['checklist', ChecklistIcon, 'Checklist item'],
            ] as const
          ).map(([action, Icon, label]) => (
            <button
              key={action}
              type="button"
              onClick={() => applyFormat(action)}
              title={label}
              aria-label={label}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-2)] hover:bg-[var(--surface-2)]"
            >
              <Icon />
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-1.5 p-3.5">
          <span className="text-xs font-semibold text-[var(--text-2)]">Body</span>
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => {
              setBody(e.target.value)
              save({ body: e.target.value })
            }}
            placeholder={'Write freely, or use the toolbar above for bold, bullets, and checklists…'}
            rows={8}
            className="w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-[var(--text-3)]"
          />
        </label>
      </div>

      {lines.some((l) => CHECKLIST_RE.test(l)) && (
        <div className="flex flex-col gap-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
          <span className="mb-1 text-xs font-semibold text-[var(--text-2)]">Checklist</span>
          {lines.map((line, i) => {
            const match = line.match(CHECKLIST_RE)
            if (!match) return null
            const checked = match[1].toLowerCase() === 'x'
            const text = match[2]
            return (
              <div key={i} className="group flex items-center gap-2 py-0.5">
                <button
                  onClick={() => toggleChecklistLine(i)}
                  className={`flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded ${
                    checked ? 'bg-[var(--good)]' : 'border border-[var(--border)]'
                  }`}
                >
                  {checked && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3}>
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
                <span className={`flex-1 text-sm ${checked ? 'text-[var(--text-3)] line-through' : ''}`}>
                  {text ? <FormattedText text={text} /> : <span className="text-[var(--text-3)]">Checklist item</span>}
                </span>
                {!checked && text && (
                  <button
                    onClick={() => sendLineToToday(text)}
                    className="shrink-0 rounded-md bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)] opacity-0 group-hover:opacity-100"
                    title="Send to Today's to-do list"
                  >
                    → Today
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-[var(--text-3)]">
        Start a line with <code className="rounded bg-[var(--surface-2)] px-1">[ ]</code> to turn it into a
        checklist item you can check off, or send straight to Today's to-do list.
      </p>
    </div>
  )
}
