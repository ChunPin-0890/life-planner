import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { nanoid } from 'nanoid'
import { db, type JournalEntry } from '../../lib/db'
import { formatDay, todayISO } from '../../lib/date'
import { awardXp } from '../../lib/xp'
import { useWeeklySummary } from '../../lib/weeklySummary'

const MOODS: { value: JournalEntry['mood']; label: string }[] = [
  { value: 1, label: 'Rough' },
  { value: 2, label: 'Meh' },
  { value: 3, label: 'Good' },
  { value: 4, label: 'Great' },
  { value: 5, label: 'Amazing' },
]

function FaceIcon({ mood, selected }: { mood: number; selected: boolean }) {
  const stroke = selected ? 'white' : 'var(--text-3)'
  const mouth =
    mood <= 1
      ? 'M8 15c1-1 2-1.5 4-1.5S15 14 16 15'
      : mood === 2
        ? 'M8 14.5h8'
        : mood === 3
          ? 'M8 14c1 1.5 2.5 2 4 2s3-.5 4-2'
          : mood === 4
            ? 'M8 14c1 2 2.5 2.6 4 2.6s3-.6 4-2.6'
            : 'M7 13.5c1.5 3 3 3.5 5 3.5s3.5-.5 5-3.5'
  return (
    <svg width={selected ? 24 : 22} height={selected ? 24 : 22} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.8}>
      <circle cx="12" cy="12" r="9" />
      <path d={mouth} />
      <circle cx="9" cy={mood >= 5 ? 9.5 : 10} r="1" fill={stroke} stroke="none" />
      <circle cx="15" cy={mood >= 5 ? 9.5 : 10} r="1" fill={stroke} stroke="none" />
    </svg>
  )
}

function shiftDate(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return todayISO(d)
}

export default function JournalPage() {
  const navigate = useNavigate()
  const today = todayISO()
  const [date, setDate] = useState(today)
  const isToday = date === today
  const entry = useLiveQuery(() => db.journalEntries.where('date').equals(date).first(), [date])
  const { daysJournaled } = useWeeklySummary()
  const [wins, setWins] = useState<string | null>(null)
  const [challenges, setChallenges] = useState<string | null>(null)
  const [tomorrowFocus, setTomorrowFocus] = useState<string | null>(null)

  function changeDate(next: string) {
    // Edits belong to the day they were typed on — reset when switching.
    setWins(null)
    setChallenges(null)
    setTomorrowFocus(null)
    setDate(next)
  }

  async function setMood(mood: JournalEntry['mood']) {
    const now = new Date().toISOString()
    if (entry) {
      await db.journalEntries.update(entry.id, { mood, updatedAt: now })
    } else {
      await db.journalEntries.add({ id: nanoid(), date, mood, wins: '', challenges: '', tomorrowFocus: '', updatedAt: now })
    }
    await awardXp('journal', date)
  }

  async function saveField(field: 'wins' | 'challenges' | 'tomorrowFocus', value: string | null) {
    // null = the field was never edited since this day was opened. Saving
    // it anyway would overwrite the stored text with ''.
    if (value === null || value === (entry?.[field] ?? '')) return
    const now = new Date().toISOString()
    if (entry) {
      await db.journalEntries.update(entry.id, { [field]: value, updatedAt: now })
    } else {
      await db.journalEntries.add({
        id: nanoid(),
        date,
        mood: 3,
        wins: '',
        challenges: '',
        tomorrowFocus: '',
        [field]: value,
        updatedAt: now,
      })
    }
    if (value.trim()) {
      await awardXp('journal', date)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Journal</h1>
          <p className="text-sm text-[var(--text-2)]">
            {isToday ? `${formatDay()} · end of day` : formatDay(new Date(date + 'T00:00:00'))}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => changeDate(shiftDate(date, -1))}
            aria-label="Previous day"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-2)] hover:bg-[var(--surface-2)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.3}>
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <button
            onClick={() => changeDate(shiftDate(date, 1))}
            disabled={isToday}
            aria-label="Next day"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-2)] hover:bg-[var(--surface-2)] disabled:opacity-30"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.3}>
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </header>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="mb-3 text-xs font-semibold text-[var(--text-2)]">
          {isToday ? 'How did today feel?' : 'How did that day feel?'}
        </div>
        <div className="flex justify-between">
          {MOODS.map((m) => {
            const selected = entry?.mood === m.value
            return (
              <button key={m.value} onClick={() => setMood(m.value)} className="flex flex-col items-center gap-1">
                <div
                  className={`flex items-center justify-center rounded-full ${
                    selected ? 'h-12 w-12 bg-[var(--accent)] shadow-[0_0_0_3px_var(--accent-soft)]' : 'h-[42px] w-[42px] bg-[var(--surface-2)]'
                  }`}
                >
                  <FaceIcon mood={m.value} selected={selected} />
                </div>
                <span className={`text-[10px] ${selected ? 'font-bold text-[var(--accent)]' : 'text-[var(--text-3)]'}`}>
                  {m.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div key={date} className="flex flex-col gap-2.5">
        <label className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
          <div className="mb-1.5 text-xs font-semibold text-[var(--text-2)]">Wins {isToday ? 'today' : 'that day'}</div>
          <textarea
            defaultValue={entry?.wins}
            onChange={(e) => setWins(e.target.value)}
            onBlur={() => saveField('wins', wins)}
            placeholder="Tap to write…"
            rows={2}
            className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-[var(--text-3)] placeholder:italic"
          />
        </label>
        <label className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
          <div className="mb-1.5 text-xs font-semibold text-[var(--text-2)]">Challenges</div>
          <textarea
            defaultValue={entry?.challenges}
            onChange={(e) => setChallenges(e.target.value)}
            onBlur={() => saveField('challenges', challenges)}
            placeholder="Tap to write…"
            rows={2}
            className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-[var(--text-3)] placeholder:italic"
          />
        </label>
        <label className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
          <div className="mb-1.5 text-xs font-semibold text-[var(--text-2)]">
            {isToday ? "Tomorrow's focus" : "Next day's focus"}
          </div>
          <textarea
            defaultValue={entry?.tomorrowFocus}
            onChange={(e) => setTomorrowFocus(e.target.value)}
            onBlur={() => saveField('tomorrowFocus', tomorrowFocus)}
            placeholder="Tap to write…"
            rows={2}
            className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-[var(--text-3)] placeholder:italic"
          />
        </label>
      </div>

      {!isToday && (
        <button onClick={() => changeDate(today)} className="self-start text-xs font-semibold text-[var(--accent)]">
          ← Back to today
        </button>
      )}

      <button
        onClick={() => navigate('/journal/weekly-review')}
        className="flex items-center justify-between rounded-2xl bg-[var(--accent-soft)] px-4 py-3.5 text-left"
      >
        <div>
          <div className="text-sm font-bold text-[var(--accent)]">This week's review</div>
          <div className="mt-0.5 text-xs text-[var(--text-2)]">{daysJournaled} of 7 days logged</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={2.3}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
    </div>
  )
}
