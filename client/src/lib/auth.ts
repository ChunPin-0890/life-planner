import { api } from './api'
import { getAccessToken, setAccessToken, getRefreshToken, setRefreshToken } from './tokenStore'

interface TokenResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export async function register(email: string, password: string) {
  await api.post('/auth/register', { email, password })
}

export async function login(email: string, password: string) {
  const { data } = await api.post<TokenResponse>('/auth/login', { email, password })
  setAccessToken(data.accessToken)
  setRefreshToken(data.refreshToken)
}

/** Called once on app start: if a refresh token survived from a previous
 * session, silently reacquire an access token so the user doesn't have to
 * log in again on every reload. */
export async function tryRestoreSession(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false
  try {
    const { data } = await api.post<TokenResponse>('/auth/refresh', { refreshToken })
    setAccessToken(data.accessToken)
    setRefreshToken(data.refreshToken)
    return true
  } catch {
    setRefreshToken(null)
    return false
  }
}

export function logout() {
  setAccessToken(null)
  setRefreshToken(null)
}

export function isAuthenticated() {
  return getAccessToken() !== null
}
