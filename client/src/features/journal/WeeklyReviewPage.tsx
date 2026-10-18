import { useNavigate } from 'react-router-dom'
import { useWeeklySummary } from '../../lib/weeklySummary'

const MOOD_LABELS = ['', 'Rough', 'Meh', 'Good', 'Great', 'Amazing']
// Indexed by Date.getDay(). The 7-day window ends today, so it doesn't
// always start on Monday — each bar is labelled from its actual date.
const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function WeeklyReviewPage() {
  const navigate = useNavigate()
  const { dates, tasksCompleted, habitConsistency, moodByDate, averageMood, xpEarned, daysJournaled } = useWeeklySummary()

  return (
    <div className="flex flex-col gap-5 p-5">
      <header className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} aria-label="Back" className="flex h-8 w-8 items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.3}>
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold">This week's review</h1>
          <p className="text-sm text-[var(--text-2)]">Last 7 days</p>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 text-center">
          <div className="text-xl font-bold text-[var(--accent)]">{tasksCompleted}</div>
          <div className="mt-0.5 text-[11px] text-[var(--text-2)]">Tasks done</div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 text-center">
          <div className="text-xl font-bold text-[var(--accent)]">{xpEarned}</div>
          <div className="mt-0.5 text-[11px] text-[var(--text-2)]">XP earned</div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 text-center">
          <div className="text-xl font-bold text-[var(--accent)]">{daysJournaled}/7</div>
          <div className="mt-0.5 text-[11px] text-[var(--text-2)]">Days journaled</div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">Mood trend</div>
        <div className="flex items-end justify-between gap-1.5" style={{ height: 80 }}>
          {moodByDate.map((mood, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className={`w-full rounded-t-md ${mood ? 'bg-[var(--accent)]' : 'bg-[var(--surface-2)]'}`}
                style={{ height: mood ? `${(mood / 5) * 100}%` : '6%' }}
                title={mood ? MOOD_LABELS[mood] : 'No entry'}
              />
              <span className="text-[10px] text-[var(--text-3)]">{WEEKDAY_LETTERS[new Date(dates[i] + 'T00:00:00').getDay()]}</span>
            </div>
          ))}
        </div>
        {averageMood !== null && (
          <div className="mt-3 text-xs text-[var(--text-2)]">
            Average mood: <span className="font-semibold">{MOOD_LABELS[Math.round(averageMood)]}</span> (
            {averageMood.toFixed(1)}/5)
          </div>
        )}
      </div>

      {habitConsistency.length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">
            Habit consistency
          </div>
          <div className="flex flex-col gap-3">
            {habitConsistency.map((h) => (
              <div key={h.habitId}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{h.title}</span>
                  <span className="font-semibold text-[var(--text-2)]">{h.percent}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                  <div className="h-full rounded-full bg-[var(--good)]" style={{ width: `${h.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
