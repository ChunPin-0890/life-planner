import axios from 'axios'
import { getAccessToken } from './tokenStore'

// In dev, Vite proxies /api to the ASP.NET Core server (see vite.config.ts),
// so the relative '/api' path works with no extra config. In production
// there's no dev proxy, so VITE_API_URL (baked in at build time) must point
// at the deployed API's own origin, e.g. https://life-planner-api.up.railway.app/api.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
})

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
