import { useEffect, useState } from 'react'

export type ThemeChoice = 'light' | 'dark' | 'system'
const THEME_KEY = 'life-planner:theme'

function apply(choice: ThemeChoice) {
  const root = document.documentElement
  if (choice === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', choice)
}

// Applied once at module load so the correct theme paints on first frame,
// before React even mounts — avoids a light-then-dark flash.
apply((localStorage.getItem(THEME_KEY) as ThemeChoice) ?? 'system')

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeChoice>(
    () => (localStorage.getItem(THEME_KEY) as ThemeChoice) ?? 'system',
  )

  useEffect(() => {
    apply(theme)
  }, [theme])

  function setTheme(choice: ThemeChoice) {
    localStorage.setItem(THEME_KEY, choice)
    setThemeState(choice)
  }

  return { theme, setTheme }
}
