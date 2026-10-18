import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { TodayIcon, HabitsIcon, GoalsIcon, JournalIcon, NotesIcon } from './NavIcons'
import LevelBadge, { useLevel } from '../components/LevelBadge'
import { useAuth } from './AuthContext'
import AchievementUnlockToast from '../components/AchievementUnlockToast'
import LevelUpToast from '../components/LevelUpToast'
import ToastHost from '../components/ToastHost'

const NAV_ITEMS = [
  { to: '/', label: 'Today', Icon: TodayIcon, end: true },
  { to: '/habits', label: 'Habits', Icon: HabitsIcon, end: false },
  { to: '/goals', label: 'Goals', Icon: GoalsIcon, end: false },
  { to: '/notes', label: 'Notes', Icon: NotesIcon, end: false },
  { to: '/journal', label: 'Journal', Icon: JournalIcon, end: false },
]

function SidebarLevel() {
  const { level, xpIntoLevel, xpForNextLevel } = useLevel()
  return (
    <div className="mt-auto flex items-center gap-3 border-t border-[var(--border)] px-2 pt-4">
      <LevelBadge size={34} />
      <div className="min-w-0">
        <div className="text-xs font-semibold">Level {level}</div>
        <div className="text-[11px] text-[var(--text-3)]">
          {xpIntoLevel} / {xpForNextLevel} XP
        </div>
      </div>
    </div>
  )
}

export default function Layout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-svh bg-[var(--bg)] text-[var(--text)] md:flex">
      <AchievementUnlockToast />
      <LevelUpToast />
      <ToastHost />
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:gap-1 md:border-r md:border-[var(--border)] md:bg-[var(--surface)] md:p-4">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)] text-white text-xs font-semibold">
            LP
          </div>
          <span className="font-semibold">Life Planner</span>
        </div>
        {NAV_ITEMS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                isActive
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'text-[var(--text-2)] hover:bg-[var(--surface-2)]'
              }`
            }
          >
            <Icon className="h-[18px] w-[18px]" />
            {label}
          </NavLink>
        ))}
        <SidebarLevel />
        <button
          onClick={handleLogout}
          className="mt-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-[var(--text-2)] hover:bg-[var(--surface-2)]"
        >
          Log out
        </button>
      </aside>

      {/* Content */}
      <main className="mx-auto w-full max-w-md pb-20 md:max-w-2xl md:flex-1 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom tab nav */}
      <nav className="fixed inset-x-0 bottom-0 flex items-center justify-around border-t border-[var(--border)] bg-[var(--surface)] px-2 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 md:hidden">
        {NAV_ITEMS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1 text-[10px] ${
                isActive ? 'text-[var(--accent)] font-semibold' : 'text-[var(--text-3)]'
              }`
            }
          >
            <Icon className="h-[22px] w-[22px]" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
