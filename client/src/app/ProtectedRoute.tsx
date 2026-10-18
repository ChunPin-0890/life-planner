import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function ProtectedRoute() {
  const { status } = useAuth()

  if (status === 'loading') {
    return <div className="flex min-h-svh items-center justify-center text-sm text-[var(--text-3)]">Loading…</div>
  }
  if (status === 'anon') {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}
