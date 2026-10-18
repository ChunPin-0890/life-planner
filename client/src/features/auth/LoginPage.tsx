import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../app/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setError('')
    setBusy(true)
    try {
      await login(email, password)
      navigate('/')
    } catch {
      setError('Incorrect email or password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-[var(--bg)] p-5">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"
      >
        <div className="mb-1 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)] text-xs font-semibold text-white">
            LP
          </div>
          <span className="font-semibold">Life Planner</span>
        </div>
        <h1 className="text-lg font-bold">Log in</h1>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-[var(--text-2)]">Email</span>
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-[var(--text-2)]">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>

        {error && <p className="text-xs font-medium text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-1 rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white disabled:opacity-40"
        >
          {busy ? 'Logging in…' : 'Log in'}
        </button>

        <p className="text-center text-xs text-[var(--text-2)]">
          No account?{' '}
          <Link to="/register" className="font-semibold text-[var(--accent)]">
            Register
          </Link>
        </p>
      </form>
    </div>
  )
}
