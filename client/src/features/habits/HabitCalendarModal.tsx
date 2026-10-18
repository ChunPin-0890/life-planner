import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Habit } from '../../lib/db'
import { todayISO } from '../../lib/date'

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** Mon=0..Sun=6 grid, unlike Date.getDay()'s Sun=0..Sat=6. */
function mondayIndex(date: Date) {
  return (date.getDay() + 6) % 7
}

function buildMonthGrid(year: number, month: number): (string | null)[] {
  const firstOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leadingBlanks = mondayIndex(firstOfMonth)

  const cells: (string | null)[] = Array(leadingBlanks).fill(null)
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(`${year}-${pad(month + 1)}-${pad(day)}`)
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export default function HabitCalendarModal({ habit }: { habit: Habit }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth()) // 0-indexed

  const logs = useLiveQuery(() => db.habitLogs.where('habitId').equals(habit.id).toArray(), [habit.id]) ?? []
  const completedDates = new Set(logs.filter((l) => l.completed).map((l) => l.date))

  const cells = buildMonthGrid(year, month)
  const monthCompletedCount = cells.filter((c) => c && completedDates.has(c)).length
  const monthDayCount = cells.filter(Boolean).length
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()
  const todayStr = todayISO()

  function prevMonth() {
    if (month === 0) {
      setYear((y) => y - 1)
      setMonth(11)
    } else {
      setMonth((m) => m - 1)
    }
  }

  function nextMonth() {
    if (month === 11) {
      setYear((y) => y + 1)
      setMonth(0)
    } else {
      setMonth((m) => m + 1)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          aria-label="Previous month"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-2)] hover:bg-[var(--surface-2)]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.3}>
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <span className="text-sm font-bold">
          {MONTH_NAMES[month]} {year}
        </span>
        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          aria-label="Next month"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-2)] hover:bg-[var(--surface-2)] disabled:opacity-30"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.3}>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAY_LABELS.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-[var(--text-3)]">
            {d}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={i} />
          const completed = completedDates.has(date)
          const isToday = date === todayStr
          const dayNum = parseInt(date.slice(-2), 10)
          return (
            <div
              key={i}
              title={date}
              className={`flex aspect-square items-center justify-center rounded-md text-[10px] font-semibold ${
                completed
                  ? 'bg-[var(--good)] text-white'
                  : 'bg-[var(--surface-2)] text-[var(--text-3)]'
              } ${isToday ? 'ring-2 ring-[var(--accent)] ring-offset-1' : ''}`}
            >
              {dayNum}
            </div>
          )
        })}
      </div>

      <div className="rounded-xl bg-[var(--surface-2)] p-3 text-center text-sm">
        <span className="font-bold">{monthCompletedCount}</span>
        <span className="text-[var(--text-2)]"> of {monthDayCount} days completed this month</span>
      </div>
    </div>
  )
}
