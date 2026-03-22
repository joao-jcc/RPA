import { useState, useEffect } from 'react'

export type Theme = 'light' | 'dark'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    (localStorage.getItem('theme') as Theme) ?? 'light'
  )

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'light') root.classList.remove('light')
    else root.classList.add('light')
    // NOTE: 'light' class = dark mode vars, absence = light vars
    // Actually let's do it correctly:
    if (theme === 'light') {
      root.classList.add('light')
    } else {
      root.classList.remove('light')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggle = () => setTheme(t => t === 'light' ? 'dark' : 'light')
  return { theme, toggle }
}
