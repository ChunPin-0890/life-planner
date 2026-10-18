import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { db } from '../../lib/db'
import { useLevel } from '../../components/LevelBadge'
import { computeRank, XP_REWARDS } from '../../lib/xp'
import { useAuth } from '../../app/AuthContext'
import { api } from '../../lib/api'
import { useTheme } from '../../lib/theme'
import Mascot from '../../components/Mascot'
import BadgeGrid from '../../components/BadgeGrid'
import { useMascotState } from '../../lib/mascotMood'
import { toast } from '../../lib/toast'

function RankBadge({ rank }: { rank: string }) {
  const colors: Record<string, string> = {
    E: '#9a9994',
    D: '#2f9e5c',
    C: '#3654c9',
    B: '#7c3aed',
    A: '#c9853b',
    S: '#dc2626',
  }
  return (
    <div
      className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-black text-white"
      style={{ backgroundColor: colors[rank] }}
    >
      {rank}
    </div>
  )
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { level, xpIntoLevel, xpForNextLevel } = useLevel()
  const rank = computeRank(level)
  const [email, setEmail] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const { theme, setTheme } = useTheme()
  const { mood } = useMascotState()

  useEffect(() => {
    api
      .get('/me')
      .then((r) => {
        setEmail(r.data.email)
        setDisplayName(r.data.displayName)
      })
      .catch(() => {})
  }, [])

  async function saveDisplayName() {
    setEditingName(false)
    if (nameDraft.trim() === (displayName ?? '')) return
    setSavingName(true)
    try {
      const { data } = await api.put('/me', { displayName: nameDraft.trim() })
      setDisplayName(data.displayName)
      toast('Name updated')
    } finally {
      setSavingName(false)
    }
  }

  const goalsCount = useLiveQuery(() => db.goals.count()) ?? 0
  const activeHabitsCount = useLiveQuery(() => db.habits.count()) ?? 0
  const notesCount =
    useLiveQuery(async () => (await db.notes.toArray()).filter((n) => n.folder !== '__north_star__').length) ?? 0
  const milestonesDone =
    useLiveQuery(async () => (await db.milestones.toArray()).filter((m) => m.done).length) ?? 0
  const xpEventsCount = useLiveQuery(() => db.xpEvents.count()) ?? 0

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    try {
      await api.delete('/me')
      await logout() // clears the token + wipes local IndexedDB
      navigate('/login')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      <header className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} aria-label="Back" className="flex h-8 w-8 items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.3}>
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <h1 className="text-xl font-bold">Profile</h1>
      </header>

      <div className="flex justify-center">
        <Mascot level={level} mood={mood} size={104} />
      </div>

      <div className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <RankBadge rank={rank.rank} />
        <div className="min-w-0 flex-1">
          {editingName ? (
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={saveDisplayName}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              disabled={savingName}
              placeholder="Your name"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm font-bold outline-none focus:border-[var(--accent)] disabled:opacity-50"
            />
          ) : (
            <button
              onClick={() => {
                setNameDraft(displayName ?? '')
                setEditingName(true)
              }}
              className="text-left text-sm font-bold"
            >
              {displayName || 'Add your name'}
            </button>
          )}
          <div className="truncate text-xs text-[var(--text-2)]">{email ?? '…'}</div>
          <div className="mt-0.5 text-[11px] font-semibold text-[var(--accent)]">{rank.name}</div>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
              <div
                className="h-full rounded-full bg-[var(--accent)]"
                style={{ width: `${xpForNextLevel ? (xpIntoLevel / xpForNextLevel) * 100 : 0}%` }}
              />
            </div>
            <span className="whitespace-nowrap text-[11px] font-semibold text-[var(--text-2)]">
              Lv {level} · {xpIntoLevel}/{xpForNextLevel} XP
            </span>
          </div>
          {rank.nextRankLevel && (
            <div className="mt-1 text-[11px] text-[var(--text-3)]">
              Reach level {rank.nextRankLevel} for {computeRank(rank.nextRankLevel).name}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
          <div className="text-lg font-bold">{goalsCount}</div>
          <div className="text-xs text-[var(--text-2)]">Goals</div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
          <div className="text-lg font-bold">{milestonesDone}</div>
          <div className="text-xs text-[var(--text-2)]">Milestones hit</div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
          <div className="text-lg font-bold">{activeHabitsCount}</div>
          <div className="text-xs text-[var(--text-2)]">Habits tracked</div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
          <div className="text-lg font-bold">{notesCount}</div>
          <div className="text-xs text-[var(--text-2)]">Notes</div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">
          Lifetime XP earned
        </div>
        <div className="text-sm text-[var(--text-2)]">
          {xpEventsCount} completed actions · roughly {xpEventsCount} tasks, habits, milestones (+
          {XP_REWARDS.milestone} each), journal entries, and daily quest bonuses combined.
        </div>
      </div>

      <BadgeGrid />

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">Appearance</div>
        <div className="flex gap-2">
          {(['light', 'dark', 'system'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`flex-1 rounded-xl py-2 text-xs font-semibold capitalize ${
                theme === t ? 'bg-[var(--accent)] text-white' : 'border border-[var(--border)] text-[var(--text-2)]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="rounded-xl border border-[var(--border)] py-3 text-sm font-semibold text-[var(--text-2)]"
      >
        Log out
      </button>

      <div className="rounded-2xl border border-red-200 p-4">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-600">Danger zone</div>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="mt-2 text-sm font-semibold text-red-600"
          >
            Delete account
          </button>
        ) : (
          <div className="mt-2 flex flex-col gap-2.5">
            <p className="text-xs text-[var(--text-2)]">
              This permanently deletes your account and everything in it — goals, habits, notes, journal, XP. This
              can't be undone. Type <span className="font-mono font-bold">DELETE</span> to confirm.
            </p>
            <input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="rounded-xl border border-red-300 bg-[var(--surface)] px-3.5 py-2.5 text-sm outline-none focus:border-red-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteConfirmText('')
                }}
                className="flex-1 rounded-xl border border-[var(--border)] py-2.5 text-sm font-semibold text-[var(--text-2)]"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || deleting}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                {deleting ? 'Deleting…' : 'Delete forever'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
