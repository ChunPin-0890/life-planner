import { useState } from 'react'
import { db, type ScheduleBlock } from '../../lib/db'
import { toast } from '../../lib/toast'

export default function EditScheduleBlockForm({ block, onDone }: { block: ScheduleBlock; onDone: () => void }) {
  const [title, setTitle] = useState(block.title)
  const [startTime, setStartTime] = useState(block.startTime)
  const [endTime, setEndTime] = useState(block.endTime)
  const [error, setError] = useState('')

  async function saveTitle() {
    const trimmed = title.trim()
    if (!trimmed || trimmed === block.title) return
    await db.scheduleBlocks.update(block.id, { title: trimmed, updatedAt: new Date().toISOString() })
    toast('Event updated')
  }

  async function saveTimes(nextStart: string, nextEnd: string) {
    if (nextEnd <= nextStart) {
      setError('End time must be after start time.')
      return
    }
    setError('')
    await db.scheduleBlocks.update(block.id, {
      startTime: nextStart,
      endTime: nextEnd,
      updatedAt: new Date().toISOString(),
    })
    toast('Event updated')
  }

  async function remove() {
    await db.scheduleBlocks.delete(block.id)
    toast('Event deleted')
    onDone()
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[var(--text-2)]">Event</span>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.currentTarget.blur()
            onDone()
          }}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
        />
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-xs font-semibold text-[var(--text-2)]">Start</span>
          <input
            type="time"
            value={startTime}
            onChange={(e) => {
              setStartTime(e.target.value)
              saveTimes(e.target.value, endTime)
            }}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-xs font-semibold text-[var(--text-2)]">End</span>
          <input
            type="time"
            value={endTime}
            onChange={(e) => {
              setEndTime(e.target.value)
              saveTimes(startTime, e.target.value)
            }}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
      </div>

      {error && <p className="text-xs font-medium text-red-600">{error}</p>}

      <button
        type="button"
        onClick={remove}
        className="rounded-xl border border-[var(--border)] py-3 text-sm font-semibold text-red-600"
      >
        Delete event
      </button>
    </div>
  )
}
