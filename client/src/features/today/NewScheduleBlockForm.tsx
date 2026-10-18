import { useState } from 'react'
import { nanoid } from 'nanoid'
import { db } from '../../lib/db'
import { todayISO } from '../../lib/date'
import { toast } from '../../lib/toast'

export default function NewScheduleBlockForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [error, setError] = useState('')

  async function submit() {
    const trimmed = title.trim()
    if (!trimmed) return
    if (endTime <= startTime) {
      setError('End time must be after start time.')
      return
    }
    await db.scheduleBlocks.add({
      id: nanoid(),
      date: todayISO(),
      startTime,
      endTime,
      title: trimmed,
      updatedAt: new Date().toISOString(),
    })
    toast('Added to schedule')
    onDone()
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="flex flex-col gap-4"
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[var(--text-2)]">Event</span>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Deep work — business plan"
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
              setError('')
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
              setError('')
            }}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
      </div>

      {error && <p className="text-xs font-medium text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={!title.trim()}
        className="mt-1 rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white disabled:opacity-40"
      >
        Add to schedule
      </button>
    </form>
  )
}
