import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import * as auth from '../lib/auth'
import { pullAll } from '../lib/sync'
import { clearAllLocalData } from '../lib/db'

interface AuthState {
  status: 'loading' | 'authed' | 'anon'
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

// Runs after any successful sign-in (fresh login, registration, or a
// restored session): pull whatever this account already has on the server
// into local Dexie. Demo-data seeding was removed — a real account should
// start genuinely empty, not pre-populated with sample content the user
// then has to clean up (see lib/seed.ts, kept only for reference/tests).
async function afterAuthed() {
  await pullAll()
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('loading')

  useEffect(() => {
    auth.tryRestoreSession().then(async (restored) => {
      if (restored) {
        await afterAuthed()
        setStatus('authed')
      } else {
        setStatus('anon')
      }
    })
  }, [])

  async function login(email: string, password: string) {
    await auth.login(email, password)
    await afterAuthed()
    setStatus('authed')
  }

  async function register(email: string, password: string) {
    await auth.register(email, password)
    await auth.login(email, password)
    await afterAuthed()
    setStatus('authed')
  }

  async function logout() {
    // Order matters: drop the auth token first so the sync hooks' isAuthenticated()
    // check is already false by the time clearAllLocalData() fires its
    // per-row "deleting" hooks — otherwise clearing the local cache on
    // logout would be mistaken for the user deleting everything and push
    // DELETE requests for their own data to the server.
    auth.logout()
    await clearAllLocalData()
    setStatus('anon')
  }

  return <AuthContext.Provider value={{ status, login, register, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
