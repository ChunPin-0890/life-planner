// Minimal global toast emitter — a tiny pub/sub so any code (forms, sync
// logic, etc.) can fire a toast without needing React context plumbing.
// ToastHost (mounted once in Layout) is the only subscriber that renders.
type Listener = (message: string) => void

let listeners: Listener[] = []

export function toast(message: string) {
  listeners.forEach((l) => l(message))
}

export function subscribeToast(fn: Listener): () => void {
  listeners.push(fn)
  return () => {
    listeners = listeners.filter((l) => l !== fn)
  }
}
