import { useEffect, useState } from 'react'
import { subscribeToast } from '../lib/toast'

interface ToastItem {
  id: number
  message: string
}

let nextId = 0

/** Mount once near the app root. Renders a small stack of auto-dismissing
 * toasts fired from anywhere via lib/toast's `toast(message)`. */
export default function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    return subscribeToast((message) => {
      const id = nextId++
      setItems((prev) => [...prev, { id, message }])
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id))
      }, 2200)
    })
  }, [])

  if (items.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[80] flex flex-col items-center gap-2 px-4 md:bottom-6">
      {items.map((t) => (
        <div
          key={t.id}
          className="animate-[badge-pop_0.25s_ease-out] flex items-center gap-2 rounded-full bg-[var(--text)] px-4 py-2.5 text-sm font-medium text-[var(--bg)] shadow-lg"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--good)" strokeWidth={2.8}>
            <path d="M20 6L9 17l-5-5" />
          </svg>
          {t.message}
        </div>
      ))}
    </div>
  )
}
