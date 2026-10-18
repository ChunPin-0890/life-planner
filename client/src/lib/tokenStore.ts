// Shared token state — see auth.ts for the tradeoff notes on why the access
// token is memory-only and the refresh token lives in localStorage. Split
// into its own module so both api.ts (attaches the header) and auth.ts
// (sets it on login) can depend on it without importing each other.
const REFRESH_TOKEN_KEY = 'life-planner:refreshToken'

let accessToken: string | null = null

export function getAccessToken() {
  return accessToken
}

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setRefreshToken(token: string | null) {
  if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token)
  else localStorage.removeItem(REFRESH_TOKEN_KEY)
}
